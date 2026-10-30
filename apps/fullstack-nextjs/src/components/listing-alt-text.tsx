'use client';
import {useEffect,useState} from 'react';
import {englishAltSource,englishCopyIssues} from '@/lib/listing-language';
import {conciseAlt} from '@/lib/listing-media-plan';
export function ListingAltText({id,description}:{id:string;description:string}) {
 const generated=conciseAlt(englishAltSource(description));
 const [text,setText]=useState(generated),[message,setMessage]=useState('');
 useEffect(()=>{try{setText(((saved)=>saved && !englishCopyIssues(saved).length?saved:generated)(localStorage.getItem(`logessa-listing-alt:${id}`)));}catch{}},[id,generated]);
 return <section className='source-card'><h3>Etsy image alt text · English</h3><p>Yüklenen tasarım görselinin Etsy alt metni. Başlık veya tag listesi değildir.</p><label>Image description (English)<textarea rows={3} maxLength={500} value={text} onChange={e=>{setText(e.target.value);try{localStorage.setItem(`logessa-listing-alt:${id}`,e.target.value);}catch{}}}/></label><small>{text.length}/500</small><div className='actions'><button type='button' onClick={async()=>{try{await navigator.clipboard.writeText(englishCopyIssues(text).length ? (()=>{throw Error("English text required");})() : text);setMessage('Alt metin kopyalandı.');}catch{setMessage('Metni alandan seçerek kopyalayabilirsin.');}}}>Copy alt text</button><button type='button' className='secondary' onClick={()=>{setText(generated);localStorage.removeItem(`logessa-listing-alt:${id}`);}}>Metni yenile</button></div><p role='status'>{message}</p></section>;
}
