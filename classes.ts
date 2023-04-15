type EndpointDescriptor = {
  endpoint: string
  status: string
}
const allEndpoints: EndpointDescriptor[] = JSON.parse(await Deno.readTextFile('endpoints.json'))[
  'data'
]
// deno-lint-ignore no-explicit-any
const queryResponses: { [key: string]: any } = {}

const endpoints = allEndpoints
  .filter((endpoint) => endpoint.status !== 'invalid' && endpoint.status !== 'unavailable')
  .map((endpoint) => endpoint.endpoint)

endpoints.forEach((endpointUrl) => {
  queryResponses[endpointUrl] = 'pending'
})

const pendingEndpoints = new Set<string>(endpoints)

endpoints.forEach((endpointUrl) => {
  try {
    queryEndpoint(new URL(endpointUrl), getClassesQuery(0, 10))
      .catch(() => undefined)
      .then((res) => queryCallback(endpointUrl, res))
  } catch (error) {
    console.log(`Failed query of endpoint: <${endpointUrl}>`, error)
    queryResponses[endpointUrl] = 'error'
  }
})

async function queryCallback(endpointUrl: string, res?: Response) {
  pendingEndpoints.delete(endpointUrl)
  console.log('Remaining endpoints: ' + pendingEndpoints.size)
  queryResponses[endpointUrl] = 'unknown error'
  if (!res) {
    queryResponses[endpointUrl] = 'no response'
  } else if (!res.ok) {
    queryResponses[endpointUrl] = 'invalid response'
  } else {
    try {
      queryResponses[endpointUrl] = await res.json()
    } catch (_error) {
      queryResponses[endpointUrl] = 'response parsing error'
    }
  }
  if (pendingEndpoints.size === 0) {
    console.log('All endpoints resolved or timed out, saving all responses')
    Deno.writeTextFileSync('./classes.json', JSON.stringify(queryResponses))
  }
}

/**
 * Query the SPARQL endpoint with the given query and handle results
 * @param endpoint
 * @param query
 * @returns JSON response content promise
 */
export function queryEndpoint(endpoint: URL, query: string) {
  let queryURL = endpoint + '?query=' + encodeURIComponent(query)
  queryURL += '&format=application%2Fsparql-results%2Bjson'
  return fetch(queryURL, {
    signal: AbortSignal.timeout(60 * 1000),
  })
}

export function getClassesQuery(offset: number, count: number) {
  return `
    SELECT DISTINCT ?class (COUNT(*) AS ?instanceCount)
    WHERE {
      ?s a ?class
    }
    GROUP BY ?class
    ORDER BY DESC(?instanceCount)
    LIMIT ${count}
    OFFSET ${offset}`
}


