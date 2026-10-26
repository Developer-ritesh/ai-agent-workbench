# Postman & OpenAPI Compatibility Matrix

## 1. Postman Collection Compatibility (Format v2.0.0 & v2.1.0)

The API Testing Studio provides bidirectional compatibility with Postman Collection schema versions 2.0.0 and 2.1.0.

| Postman Feature | Supported | Workbench Mapping & Behavior |
| :--- | :---: | :--- |
| **Collection Hierarchy** | Yes | Parsed into `ApiCollection` with top-level `requests` and nested `folders`. |
| **Folders** | Yes | Converted into `ApiFolder[]` preserving folder names and contained requests. |
| **HTTP Methods** | Yes | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, and CUSTOM methods. |
| **URL & Query Parameters** | Yes | Extracted into key-value pairs with toggleable `enabled` state. |
| **Headers** | Yes | Parsed into key-value pairs with toggleable `enabled` state. |
| **Body: raw (JSON, Text, XML)** | Yes | Supported with syntax formatting and automatic headers. |
| **Body: urlencoded** | Yes | Converted to and from `application/x-www-form-urlencoded`. |
| **Body: form-data** | Yes | Supported for multipart form values. |
| **Body: GraphQL** | Yes | Separate query and variable editors; packaged into JSON payload. |
| **Collection Variables** | Yes | Imported into collection-scoped variable storage with `{{key}}` syntax. |
| **Export to Postman v2.1.0** | Yes | Generates standard Postman v2.1.0 JSON importable by Postman desktop. |

---

## 2. Postman Scripting API (`pm.*`) Compatibility

The embedded JavaScript sandboxed test runner implements core Postman test and runtime APIs:

| API Method | Status | Notes |
| :--- | :---: | :--- |
| `pm.test(name, fn)` | Supported | Declares a named test block; captures passes and assertion errors. |
| `pm.expect(val).to.equal(expected)` | Supported | Strict equality check (`===`). |
| `pm.expect(val).to.eql(expected)` | Supported | Deep structural equality check via JSON serialization. |
| `pm.expect(val).to.be.ok()` | Supported | Truthiness assertion. |
| `pm.expect(val).to.be.true()` | Supported | Strict boolean `true` check. |
| `pm.expect(val).to.be.false()` | Supported | Strict boolean `false` check. |
| `pm.expect(val).to.be.below(n)` | Supported | Numeric threshold assertion (`<`). |
| `pm.expect(val).to.be.above(n)` | Supported | Numeric threshold assertion (`>`). |
| `pm.expect(val).to.be.oneOf(list)` | Supported | Membership assertion in array. |
| `pm.expect(val).to.have.property(prop)`| Supported | Object property existence check. |
| `pm.expect(val).to.have.status(code)` | Supported | HTTP response status check. |
| `pm.expect(val).to.have.header(name)` | Supported | Case-insensitive response header existence check. |
| `pm.response.code` | Supported | Numeric HTTP status code (e.g., `200`, `404`). |
| `pm.response.status` | Supported | Status text (e.g., `"OK"`, `"Not Found"`). |
| `pm.response.responseTime` | Supported | Total execution duration in milliseconds. |
| `pm.response.responseSize` | Supported | Response payload size in bytes. |
| `pm.response.json()` | Supported | Parses response body as JSON. |
| `pm.response.text()` | Supported | Returns raw response body text. |
| `pm.response.headers.get(name)` | Supported | Returns header value by case-insensitive name. |
| `pm.response.headers.has(name)` | Supported | Checks if header exists. |
| `pm.response.to.have.status(code)` | Supported | Direct response status assertion. |
| `pm.environment.set(key, value)` | Supported | Sets environment variable for subsequent chained requests. |
| `pm.environment.get(key)` | Supported | Reads environment variable. |
| `pm.environment.unset(key)` | Supported | Deletes environment variable. |
| `pm.environment.has(key)` | Supported | Checks if environment variable exists. |
| `pm.variables.set(key, value)` | Supported | Sets local request-scoped variable. |
| `pm.variables.get(key)` | Supported | Reads local or environment variable. |

---

## 3. OpenAPI 3.x & Swagger Specification Compatibility

| OpenAPI Feature | Supported | Description |
| :--- | :---: | :--- |
| **OpenAPI 3.0 / 3.1** | Yes | Imports JSON OpenAPI documents. |
| **Swagger 2.0** | Yes | Compatible with standard Swagger JSON endpoints. |
| **Server Base URL** | Yes | Resolves `servers[0].url` into request URLs or `{{baseUrl}}`. |
| **Path & Operation ID** | Yes | Generates named requests from `summary`, `operationId`, or path. |
| **Path Grouping by Tag** | Yes | Endpoints tagged with categories are organized into matching folders. |
| **Query Parameters** | Yes | Parameters with `in: "query"` are loaded with defaults and types. |
| **JSON Request Schema** | Yes | Extracts JSON body schemas or example payloads into the request editor. |
