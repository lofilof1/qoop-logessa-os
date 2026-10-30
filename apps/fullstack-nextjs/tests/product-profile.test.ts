import {describe,it,expect} from 'vitest';
import {blankProfile,profileSchema,prepSchema,prepareDesign,panelCount} from '../src/lib/product-profile';
import {publishPackage} from '../src/lib/publication';
const profile=()=>profileSchema.parse({confirmed:true,panelWidth:50,overlap:2,targetPpi:100,materials:[{name:'Paper',details:'Matte paper'}],shopName:'Qoop'});
const input=()=>prepSchema.parse({assetId:'asset',mode:'pattern',role:'tile',repeatWidthCm:25.4,repeatHeightCm:25.4,material:'Paper',seamReviewed:true,colorReviewed:true,sample:'approved',approve:true});
const asset={width:1000,height:1000,sha256:'hash',format:'png'};
describe('generic production settings',()=>{
 it('starts without supplier assumptions',()=>{const p=blankProfile();expect(p.panelWidth).toBeNull();expect(p.materials).toEqual([]);expect(p.confirmed).toBe(false);expect(p.productionLocation).toBe('');});
 it('uses configured visible width and unit',()=>{expect(panelCount(100,profile())?.count).toBe(3);expect(panelCount(101.6,profileSchema.parse({...profile(),unit:'in',panelWidth:21,overlap:1}))?.count).toBe(2);});
 it('rejects overlap greater than width',()=>{expect(()=>profileSchema.parse({...profile(),overlap:50})).toThrow();});
 it('evaluates physical tile size rather than wall size',()=>{const result=prepareDesign({...input(),wallWidthCm:400,wallHeightCm:300},asset,profile());expect(result.ppiX).toBe(100);expect(result.status).toBe('SOURCE_REVIEWED');expect(result.masterExport).toBe('NOT_GENERATED');});
 it('blocks missing profile and low resolution',()=>{expect(prepareDesign(input(),asset,null).status).toBe('CHECKS_PENDING');expect(prepareDesign({...input(),repeatWidthCm:50.8,repeatHeightCm:50.8},asset,profile()).status).toBe('CHECKS_PENDING');});
 it('requires a reason when a sample is waived',()=>{expect(prepareDesign({...input(),sample:'waived'},asset,profile()).status).toBe('CHECKS_PENDING');});
 it('does not approve a new file with unknown dimensions',()=>{expect(prepareDesign(input(),{...asset,width:null},profile()).status).toBe('CHECKS_PENDING');});
 it('keeps wall master checks separate',()=>{const result=prepareDesign({...input(),role:'wall-master',wallWidthCm:25.4,wallHeightCm:25.4},asset,profile());expect(result.status).toBe('MASTER_MANUALLY_APPROVED');expect(result.masterExport).toBe('NOT_GENERATED');});
});
describe('local publication package',()=>{
 it('omits unconfirmed technical values',()=>{const r=publishPackage('Design', {...profile(),confirmed:false},'id','Paper','unknown');expect(r.description).toBe('Design');expect(r.publication.status).toBe('DRAFT_ONLY');});
 it('uses only user supplied technical values and AI disclosure',()=>{const r=publishPackage('Design',profile(),'id','Paper','yes');expect(r.description).toContain('48 cm of visible');expect(r.description).toContain('Qoop with the help of AI');expect(r.description).not.toMatch(/Houston|LogicaPod|23 inches/);expect(r.publication.imagePlan).toHaveLength(9);});
 it('does not insert unsupported material claims',()=>{const p=profile();p.materials[0].details='non-toxic and safe for babies';expect(publishPackage('Design',p,'id','Paper','no').description).not.toContain('non-toxic');});
});
