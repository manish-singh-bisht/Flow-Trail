## Usage

### Basic Example

```ts
import { createFlow } from '@flow-trail/sdk';

// Create a flow
const flow = createFlow('my_process');

// Create a step
const step = flow.createStep('step_name');

// Capture observations
step.capture({
  name: 'input',
  data: {
    /* your input data */
  },
});

step.capture({
  name: 'output',
  data: {
    /* your output data */
  },
});

// Finish the step
step.finish({
  status: 'completed',
  reason: 'Step completed successfully',
});

// Finish the flow (sends all data to server)
await flow.finish();
```

### Mark nested fields as queryable for filtering

```ts
step.capture({
  name: 'evaluations',
  // this data must be array of objects
  data: [
    {
      asin: 'B01',
      metrics: {
        price: 29.99,
        rating: 4.5,
        reviews: 1247,
      },
      qualified: true,
    },
    {
      asin: 'B02',
      metrics: {
        price: 8.99,
        rating: 3.2,
        reviews: 45,
      },
      qualified: false,
    },
  ],
  queryable: {
    'metrics.price': 'number',
    'metrics.rating': 'number',
    'metrics.reviews': 'number',
    qualified: 'boolean',
  },
});
```

### Error Handling

```ts
const step = flow.createStep('risky_operation');

try {
  const result = await riskyOperation();
  step.capture({ name: 'output', data: result });
  step.finish({ status: 'completed', reason: 'Success' });
} catch (error) {
  step.capture({ name: 'error', data: { message: error.message } });
  step.finish({ status: 'failed', reason: error.message });
}
```
