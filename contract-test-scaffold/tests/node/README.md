# Node contract tests (scaffold)

## Install
```bash
cd tests/node
npm install
```

## Validate fixtures
```bash
npm run validate:fixtures
```

## Run contract tests against the Python simulator
> The contract test launches the simulator with `uvicorn`, so ensure the simulator deps are installed and `uvicorn` is in PATH.
```bash
npm test
```

### CI tip
For CI, prefer dockerizing the simulator and starting it before `npm test`.
