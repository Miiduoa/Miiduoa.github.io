import test from 'node:test';
import assert from 'node:assert/strict';
import { diffSchemas, downstreamImpact, assessSchemaChange, demoGraph } from './core.mjs';

test('removed column is breaking', () => {
  const changes = diffSchemas(
    {id:{type:'string',nullable:false}},
    {}
  );
  assert.equal(changes[0].kind,'removed');
  assert.equal(changes[0].severity,'breaking');
});

test('nullable added column is additive', () => {
  const changes = diffSchemas(
    {},
    {coupon:{type:'string',nullable:true}}
  );
  assert.equal(changes[0].severity,'additive');
});

test('customer id removal propagates to mart and export', () => {
  const graph = demoGraph();
  const impact = downstreamImpact(graph,'raw_orders','customer_id').map(x => x.dataset+'.'+x.column);
  assert.deepEqual(impact,[
    'clean_orders.customer_id',
    'order_mart.customer_id',
    'crm_export.customer_id'
  ]);
});

test('amount type change reaches dashboard through renamed column', () => {
  const graph = demoGraph();
  const before = graph.schemas.raw_orders;
  const after = structuredClone(before);
  after.amount = {type:'string',nullable:false};
  const result = assessSchemaChange(graph,'raw_orders',before,after);
  assert.ok(result.impacted.includes('order_mart.gross_amount'));
  assert.ok(result.impacted.includes('revenue_dashboard.gross_amount'));
});

test('cycles terminate through visited column keys', () => {
  const graph = {edges:[
    {from:'A',to:'B',mappings:[{from:'x',to:'x'}]},
    {from:'B',to:'A',mappings:[{from:'x',to:'x'}]}
  ]};
  const impact = downstreamImpact(graph,'A','x');
  assert.deepEqual(impact,[{dataset:'B',column:'x',via:'A.x'}]);
});
