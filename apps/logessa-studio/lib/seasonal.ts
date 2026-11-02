export type Phase="peak"|"publish"|"prepare"|"evergreen"|"quiet";
export function seasonalPhase(peaks:number[],evergreen:boolean,month:number,lead=2):Phase{
 if(evergreen)return "evergreen";if(peaks.includes(month))return "peak";
 const distance=Math.min(...peaks.map(p=>(p-month+12)%12));
 return distance===1?"publish":distance>1&&distance<=lead?"prepare":"quiet";
}
export const phaseLabels:Record<Phase,string>={peak:"Odak dönemi",publish:"İlanı hazırla",prepare:"Tasarım hazırlığı",evergreen:"Yıl boyu plan",quiet:"Özel plan yok"};
export const monthNames=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
