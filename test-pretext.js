import { prepare, layout } from '@chenglou/pretext';
const handle = prepare('Hello world this is a long text', 'bold 48px sans-serif');
const result = layout(handle, 200, 50);
console.log(JSON.stringify(result, null, 2));
