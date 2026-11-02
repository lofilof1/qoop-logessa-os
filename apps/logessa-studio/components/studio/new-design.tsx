"use client";
import { api, json } from "@/lib/client";
import { type Design, emptyBody, kindLabels } from "@/lib/domain";
import { Check, Grid2X2, ImagePlus, Layers, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Field, Modal } from "./ui";
export function NewDesign({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (d: Design) => void;
}) {
    const [name, setName] = useState(""), [kind, setKind] = useState("pattern"), [collection, setCollection] = useState(""), [keyword, setKeyword] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
    useEffect(() => { setKeyword(sessionStorage.getItem("logessa-keyword") || ""); }, []);
    const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(""); try {
        onCreate(await api("/api/designs", json({ name, kind, stage: "brief", body: { ...emptyBody(), collection, keyword } })));
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } };
    return <Modal title="Yeni bir fikre yer aç." subtitle="Bir isimle başla. Diğer detayları istediğin zaman tamamlayabilirsin." onClose={onClose}><form onSubmit={submit}><Field label="Tasarım adı"><input autoFocus required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Örn. Sessiz Bahçe"/></Field><Field label="Ürün tipi"><div className="kind-picker">{Object.entries(kindLabels).map(([k, l]) => <button type="button" key={k} className={kind === k ? "selected" : ""} onClick={() => setKind(k)}>{k === "pattern" ? <Layers size={21}/> : k === "mural" ? <ImagePlus size={21}/> : <Grid2X2 size={21}/>}<span>{l}</span>{kind === k && <Check size={14}/>}</button>)}</div></Field><div className="form-grid"><Field label="Koleksiyon · isteğe bağlı"><input value={collection} maxLength={100} onChange={e => setCollection(e.target.value)} placeholder="Örn. Botanical Stories"/></Field><Field label="Anahtar kelime · isteğe bağlı"><input value={keyword} maxLength={150} onChange={e => setKeyword(e.target.value)} placeholder="botanical wallpaper"/></Field></div>{error && <div className="alert error">{error}</div>}<div className="modal-footer"><Button secondary onClick={onClose} disabled={busy}>Vazgeç</Button><Button type="submit" disabled={busy || name.trim().length < 2}>{busy ? <Loader2 className="spin" size={16}/> : <Plus size={16}/>}Tasarımı oluştur</Button></div></form></Modal>;
}
