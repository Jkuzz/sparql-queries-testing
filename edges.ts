
export function getClassLinksQuery(class1URI: string, class2URI: string) {
  return `
    SELECT DISTINCT ?property (COUNT(*) AS ?instanceCount)
    WHERE {
      ?class1 a <${class1URI}> .
      ?class2 a <${class2URI}> .
      ?class1 ?property ?class2 .
    }
  `
}

