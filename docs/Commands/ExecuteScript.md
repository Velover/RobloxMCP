Request:

```ts
{
  "commands": [
    {
      "id": "123",
      "name": "execute_script",
      "args": {
        "code": "print('Hello world!')",
      },
      "timestamp": 1633456789012
    },
  ]
}
```

Response:

```ts
interface IResponse {
  output?: any;
  logs: string[];
}
```
