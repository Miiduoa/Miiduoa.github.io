export function diffSchemas(before, after) {
  const changes = [];
  const beforeKeys = new Set(Object.keys(before || {}));
  const afterKeys = new Set(Object.keys(after || {}));

  for (const column of beforeKeys) {
    const oldSpec = before[column];
    const newSpec = after[column];

    if (!afterKeys.has(column)) {
      changes.push({ column, kind:'removed', severity:'breaking', before:oldSpec, after:null });
      continue;
    }

    if (oldSpec.type !== newSpec.type) {
      changes.push({ column, kind:'type-change', severity:'breaking', before:oldSpec, after:newSpec });
    }

    if (oldSpec.nullable === true && newSpec.nullable === false) {
      changes.push({ column, kind:'nullability-tightened', severity:'breaking', before:oldSpec, after:newSpec });
    }
  }

  for (const column of afterKeys) {
    if (beforeKeys.has(column)) continue;
    const spec = after[column];
    const safe = spec.nullable === true || Object.prototype.hasOwnProperty.call(spec,'default');
    changes.push({ column, kind:'added', severity:safe ? 'additive' : 'breaking', before:null, after:spec });
  }

  return changes.sort((a,b) => a.column.localeCompare(b.column) || a.kind.localeCompare(b.kind));
}

export function downstreamImpact(graph, sourceDataset, sourceColumn) {
  const queue = [{ dataset:sourceDataset, column:sourceColumn }];
  const visited = new Set([sourceDataset + '.' + sourceColumn]);
  const impacted = [];

  while (queue.length) {
    const current = queue.shift();

    for (const edge of graph.edges || []) {
      if (edge.from !== current.dataset) continue;

      for (const mapping of edge.mappings || []) {
        if (mapping.from !== current.column) continue;
        const key = edge.to + '.' + mapping.to;
        if (visited.has(key)) continue;
        visited.add(key);
        const next = { dataset:edge.to, column:mapping.to, via:current.dataset + '.' + current.column };
        impacted.push(next);
        queue.push({ dataset:edge.to, column:mapping.to });
      }
    }
  }

  return impacted;
}

export function assessSchemaChange(graph, dataset, before, after) {
  const changes = diffSchemas(before,after).map(change => ({
    ...change,
    impact: change.severity === 'breaking'
      ? downstreamImpact(graph,dataset,change.column)
      : []
  }));

  const impactedKeys = new Set();
  for (const change of changes) {
    for (const item of change.impact) impactedKeys.add(item.dataset + '.' + item.column);
  }

  return {
    changes,
    impacted: [...impactedKeys].sort(),
    breaking: changes.filter(change => change.severity === 'breaking').length,
    additive: changes.filter(change => change.severity === 'additive').length
  };
}

export function demoGraph() {
  return {
    schemas:{
      raw_orders:{
        order_id:{type:'string',nullable:false},
        customer_id:{type:'string',nullable:true},
        amount:{type:'number',nullable:false},
        created_at:{type:'timestamp',nullable:false}
      },
      clean_orders:{
        order_id:{type:'string',nullable:false},
        customer_id:{type:'string',nullable:true},
        amount:{type:'number',nullable:false},
        created_at:{type:'timestamp',nullable:false}
      },
      order_mart:{
        order_id:{type:'string',nullable:false},
        customer_id:{type:'string',nullable:true},
        gross_amount:{type:'number',nullable:false}
      },
      revenue_dashboard:{
        gross_amount:{type:'number',nullable:false}
      },
      crm_export:{
        customer_id:{type:'string',nullable:true}
      }
    },
    edges:[
      {from:'raw_orders',to:'clean_orders',mappings:[
        {from:'order_id',to:'order_id'},
        {from:'customer_id',to:'customer_id'},
        {from:'amount',to:'amount'},
        {from:'created_at',to:'created_at'}
      ]},
      {from:'clean_orders',to:'order_mart',mappings:[
        {from:'order_id',to:'order_id'},
        {from:'customer_id',to:'customer_id'},
        {from:'amount',to:'gross_amount'}
      ]},
      {from:'order_mart',to:'revenue_dashboard',mappings:[
        {from:'gross_amount',to:'gross_amount'}
      ]},
      {from:'order_mart',to:'crm_export',mappings:[
        {from:'customer_id',to:'customer_id'}
      ]}
    ]
  };
}
