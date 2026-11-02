import {z} from "zod";

export const productionInput=z.object({
 idea:z.string().trim().min(1).max(240),
 kind:z.enum(["pattern","mural","art"]).default("pattern"),
 templateId:z.string().max(60).default(""),
 withImage:z.boolean().default(true),
 mode:z.enum(["ai","market"]).default("ai"),
 requestId:z.string().uuid(),
});
export type ProductionInput=z.infer<typeof productionInput>;
export const plannerSchema=z.object({seedKeywords:z.array(z.string().min(2).max(100)).min(1).max(3),direction:z.string().min(10).max(1200)});
export const packageSchema=z.object({
 name:z.string().min(3).max(100),collection:z.string().min(3).max(100),
 motif:z.string().min(5).max(200),style:z.string().min(3).max(200),room:z.string().min(3).max(120),
 palette:z.array(z.object({hex:z.string().regex(/^#[0-9a-fA-F]{6}$/),name:z.string().min(2).max(40)})).min(3).max(5),
 strategy:z.string().min(30).max(2400),rationale:z.string().min(30).max(2400),
 imagePrompt:z.string().min(100).max(6000),
 title:z.string().min(10).max(140),tags:z.array(z.string().min(1).max(20)).length(13),description:z.string().min(150).max(6500),
 primaryKeyword:z.string().min(2).max(100),warnings:z.array(z.string().max(400)).max(8),
});
export type GeneratedPackage=z.infer<typeof packageSchema>;
// All properties are required for strict OpenAI JSON schema output.
const str=(min=1,max=500)=>({type:"string",minLength:min,maxLength:max});
const obj=(properties:Record<string,unknown>)=>({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
export const plannerJSON=obj({seedKeywords:{type:"array",items:str(2,100),minItems:1,maxItems:3},direction:str(10,1200)});
export const packageJSON=obj({name:str(3,100),collection:str(3,100),motif:str(5,200),style:str(3,200),room:str(3,120),palette:{type:"array",items:obj({hex:{type:"string",pattern:"^#[0-9a-fA-F]{6}$"},name:str(2,40)}),minItems:3,maxItems:5},strategy:str(30,2400),rationale:str(30,2400),imagePrompt:str(100,6000),title:str(10,140),tags:{type:"array",items:str(1,20),minItems:13,maxItems:13},description:str(150,6500),primaryKeyword:str(2,100),warnings:{type:"array",items:str(1,400),maxItems:8}});

export const productionSteps=["plan","research","compose","image","done"] as const;
export type ProductionStep=typeof productionSteps[number];
export const stepLabels:Record<string,string>={plan:"Fikrin tasarım yönü hazırlanıyor",research:"Alura’da talep ve ilgili kelimeler araştırılıyor",compose:"Brief, palet ve İngilizce ilan yazılıyor",image:"Özgün master görsel üretiliyor",done:"Paketin hazır"};
export type ProductionJob={id:string;idea:string;kind:string;withImage:boolean;status:string;step:ProductionStep;designId:string|null;error:string|null;createdAt:string;updatedAt:string;leaseUntil:number;output:Record<string,any>;};

export const launchTemplates=[
 {id:"botanical",name:"Botanik Hikâyeler",idea:"Vintage botanical olive branches wallpaper",label:"Zeytin dalları · sıcak fildişi",palette:["#6f7857","#eae3ce","#a76f4c"],kind:"pattern"},
 {id:"japandi",name:"Sessiz Japandi",idea:"Minimal Japanese bamboo ink wash wallpaper",label:"Bambu · mürekkep · doğal tonlar",palette:["#8b9577","#e6e1d4","#515a4b"],kind:"pattern"},
 {id:"academia",name:"Dark Academia",idea:"Moody vintage woodland botanical wallpaper",label:"Orman · eski botanik · koyu yeşil",palette:["#263c32","#8d7956","#c8b89a"],kind:"pattern"},
 {id:"nursery",name:"Minik Bir Dünya",idea:"Neutral woodland animals nursery wallpaper",label:"Orman hayvanları · nötr çocuk odası",palette:["#9da487","#e9deca","#b38d72"],kind:"pattern"},
 {id:"mural",name:"Uzak Manzaralar",idea:"Misty mountain forest wall mural",label:"Sisli dağlar · katmanlı manzara",palette:["#7e9289","#bbc8bf","#e6e8df"],kind:"mural"},
 {id:"celestial",name:"Gökyüzü Atlası",idea:"Vintage celestial constellation wallpaper",label:"Yıldız haritaları · gece mavisi",palette:["#28334a","#b4a070","#e4d9bd"],kind:"pattern"},
] as const;
