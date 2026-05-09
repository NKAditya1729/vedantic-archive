import { getCollection } from 'astro:content';
import audioManifest from '../../content/audio_manifest.json';

export async function GET({ request }) {
  const allClasses = await getCollection('classes');
  
  const iastClasses = allClasses.filter(c => c.data.script === 'iast');
  
  // Sort by date descending
  iastClasses.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
  
  // Take top 5
  const latestClasses = iastClasses.slice(0, 5);
  
  const notes = latestClasses.map(cls => {
    const id = `${cls.data.series}.${cls.data.adhyaya}-${cls.data.brahmana}.class-${String(cls.data.class_number).padStart(2, '0')}`;
    const stableId = `BU-${cls.data.adhyaya}.${cls.data.brahmana}-C${String(cls.data.class_number).padStart(2, '0')}`;
    const audioInfo = audioManifest[id] || {};
    
    return {
      id: id,
      stableId: stableId,
      series: cls.data.series,
      title: `${cls.data.brahmana_name} — Class ${cls.data.class_number}`,
      dateTaught: cls.data.date,
      url: `/${cls.data.series}/${cls.data.adhyaya}-${cls.data.brahmana}/class-${String(cls.data.class_number).padStart(2, '0')}/`,
      audioUrl: audioInfo.productionUrl || audioInfo.localPath || null,
      shortSummary: cls.data.coverage,
    };
  });

  return new Response(JSON.stringify(notes, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
