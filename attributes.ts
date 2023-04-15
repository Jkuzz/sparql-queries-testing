export function getAttributesQuery(classURI: string) {
  return `
    SELECT DISTINCT ?attribute ?type (COUNT(1) AS ?instanceCount)
    WHERE {
      ?instance
          a <${classURI}> ;
        ?attribute ?targetLiteral
      FILTER isLiteral(?targetLiteral)
      BIND(datatype(?targetLiteral) AS ?type)
    }
    ORDER BY DESC(?instanceCount)
    `
}
