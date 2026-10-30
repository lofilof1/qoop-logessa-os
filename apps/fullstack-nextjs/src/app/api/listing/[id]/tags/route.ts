import { db } from '@/lib/db';
import { localMutation } from '@/lib/image-connection';
import { chooseLocalTags, localTagPool } from '@/lib/local-listing-tags';
import { listingResearchRows } from '@/lib/listing-research';
import { visionCandidates, visualSchema } from '@/lib/listing-vision';
export async function POST(r: Request, {params}: {params: Promise<{id:string}>}) {
  try {
    localMutation(r);
    const {id} = await params;
    const draft = await db.listingDraft.findUnique({where:{id}});
    if (!draft) return Response.json({error:'Taslak bulunamadı.'},{status:404});
    const job = await db.analysisReviewJob.findUnique({where:{id:draft.jobId}});
    if (job?.state !== 'SUCCEEDED') throw Error('Önce görsel okuması tamamlanmalı.');
    const result = job.result as any;
    const visual = visualSchema.parse({...result.visual, imageRead:true, summary:result.visualSummary, searchTerms:result.visual?.searchTerms || result.tags, uncertainties:result.visual?.uncertainties || [], rooms:result.visual?.rooms || [], product:result.visual?.product || 'wallpaper'});
    const candidates = visionCandidates(await listingResearchRows(),visual,50);
    const tags = chooseLocalTags(result.tags,localTagPool(visual,candidates));
    const tagEvidence = tags.map(tag => {
      const c = candidates.find(c => c.term === tag);
      return {tag,origin:c?'research':'visual-suggestion',searches:c?.searches||null,competition:c?.competition||null,sourceFile:c?.sourceFile||null,sourceRow:c?.sourceRow??null,sourceDate:c?.sourceDate||null,market:c?.market||'unknown',rankingAllowed:c?.rankingAllowed||false,period:c?.period||null,definition:c?.definition||'unknown'};
    });
    await db.analysisReviewJob.update({where:{id:job.id},data:{result:JSON.parse(JSON.stringify({...result,tags,tagEvidence,tagPolicy:'etsy-diversity-2026-10-29',previousTagSets:[...(result.previousTagSets||[]),{tags:result.tags,at:new Date().toISOString()}].slice(-5)}))}});
    return Response.json({tags});
  } catch(e) {return Response.json({error:e instanceof Error?e.message:'Etiketler güncellenemedi.'},{status:400});}
}
