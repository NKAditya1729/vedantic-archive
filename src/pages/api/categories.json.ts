import { getCollection } from 'astro:content';

export async function GET({ request }) {
  const allClasses = await getCollection('classes');
  
  const iastClasses = allClasses.filter(c => c.data.script === 'iast');
  
  const seriesMap = new Map();
  
  for (const cls of iastClasses) {
    const sId = cls.data.series;
    if (!seriesMap.has(sId)) {
      seriesMap.set(sId, {
        id: sId,
        title: cls.data.series_title,
        adhyayas: new Map()
      });
    }
    
    const s = seriesMap.get(sId);
    const aId = cls.data.adhyaya;
    if (!s.adhyayas.has(aId)) {
      s.adhyayas.set(aId, {
        adhyayaNumber: aId,
        brahmanas: new Map()
      });
    }
    
    const a = s.adhyayas.get(aId);
    const bId = cls.data.brahmana;
    if (!a.brahmanas.has(bId)) {
      a.brahmanas.set(bId, {
        brahmanaNumber: bId,
        brahmanaName: cls.data.brahmana_name,
        classesCount: 0
      });
    }
    
    a.brahmanas.get(bId).classesCount++;
  }
  
  // Convert maps to arrays
  const result = Array.from(seriesMap.values()).map(s => ({
    ...s,
    adhyayas: Array.from(s.adhyayas.values()).map(a => ({
      ...a,
      brahmanas: Array.from(a.brahmanas.values())
    })).sort((a, b) => a.adhyayaNumber - b.adhyayaNumber)
  }));

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
