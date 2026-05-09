import { getCollection } from 'astro:content';
import audioManifest from '../../content/audio_manifest.json';

export async function GET({ request }) {
  const allClasses = await getCollection('classes');
  
  // For the API, we will just return the IAST entries to avoid duplicates,
  // or we could return both and let the app decide. The app will likely want
  // one logical entry per class and can toggle scripts internally.
  const iastClasses = allClasses.filter(c => c.data.script === 'iast');
  
  const notes = iastClasses.map(cls => {
    const id = `${cls.data.series}.${cls.data.adhyaya}-${cls.data.brahmana}.class-${String(cls.data.class_number).padStart(2, '0')}`;
    const stableId = `BU-${cls.data.adhyaya}.${cls.data.brahmana}-C${String(cls.data.class_number).padStart(2, '0')}`;
    
    // Attempt to get audio manifest info
    const audioInfo = audioManifest[id] || {};
    
    return {
      id: id,
      stableId: stableId,
      series: cls.data.series,
      seriesTitle: cls.data.series_title,
      adhyaya: cls.data.adhyaya,
      brahmana: cls.data.brahmana,
      brahmanaName: cls.data.brahmana_name,
      classNumber: cls.data.class_number,
      dateTaught: cls.data.date,
      title: `${cls.data.brahmana_name} — Class ${cls.data.class_number}`,
      shortSummary: cls.data.coverage,
      url: `/${cls.data.series}/${cls.data.adhyaya}-${cls.data.brahmana}/class-${String(cls.data.class_number).padStart(2, '0')}/`,
      urlDevanagari: `/${cls.data.series}/${cls.data.adhyaya}-${cls.data.brahmana}/class-${String(cls.data.class_number).padStart(2, '0')}/?script=devanagari`,
      urlIAST: `/${cls.data.series}/${cls.data.adhyaya}-${cls.data.brahmana}/class-${String(cls.data.class_number).padStart(2, '0')}/?script=iast`,
      audioFile: audioInfo.mp3Filename || null,
      audioUrl: audioInfo.productionUrl || audioInfo.localPath || null,
      youtubeUrl: cls.data.video_url || null,
      tags: [],
      topics: [],
      reviewStatus: "audio-reviewed-and-editor-corrected",
      lastUpdated: new Date().toISOString().split('T')[0] // or use git modification date if available
    };
  });

  return new Response(JSON.stringify(notes, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
