pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const APP_BASE=new URL('.',document.currentScript.src).href;
const KOREAN_FONT_CDN='https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf';
const KOREAN_FONT_B64_PATH='fonts/korean-base64.js';
const KOREAN_FONT_PATH='fonts/NanumGothic-Regular.ttf';
let _koreanFontCache=null;
let _koreanFontWarned=false;
let _koreanFontB64Promise=null;

function loadKoreanFontBase64(){
    if(_koreanFontB64Promise)return _koreanFontB64Promise;
    _koreanFontB64Promise=new Promise((resolve,reject)=>{
        if(window._KOREAN_FONT_BASE64)return resolve();
        const s=document.createElement('script');
        s.src=new URL(KOREAN_FONT_B64_PATH,APP_BASE).href;
        s.onload=()=>window._KOREAN_FONT_BASE64?resolve():reject(new Error('base64 missing'));
        s.onerror=()=>reject(new Error('script load failed'));
        document.head.appendChild(s);
    });
    return _koreanFontB64Promise;
}

async function embedPretendard(pdfDoc){
    if(_koreanFontCache==='FAIL'){
        return await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    }
    if(!_koreanFontCache){
        const isFile=location.protocol==='file:';
        // file://에서는 fetch가 차단되므로 base64 script 우선
        if(isFile){
            try{
                await loadKoreanFontBase64();
                const bin=atob(window._KOREAN_FONT_BASE64);
                const arr=new Uint8Array(bin.length);
                for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i)&0xff;
                // TTF 시그니처(0x00010000) 또는 OTTO 검증
                const sigOK=(arr[0]===0x00&&arr[1]===0x01&&arr[2]===0x00&&arr[3]===0x00)
                          ||(arr[0]===0x4F&&arr[1]===0x54&&arr[2]===0x54&&arr[3]===0x4F);
                if(sigOK){_koreanFontCache=arr}
                else{console.warn('[free.pdf] base64 디코딩 결과 손상',arr.slice(0,4))}
            }catch(e){console.warn('[free.pdf] base64 폰트 로드 실패',e)}
        }
        // http(s) 환경 또는 base64 실패 시 fetch 시도
        if(!_koreanFontCache){
            const urls=isFile?[]:[new URL(KOREAN_FONT_PATH,APP_BASE).href,KOREAN_FONT_CDN];
            for(const url of urls){
                try{
                    const res=await fetch(url);
                    if(res.ok){
                        _koreanFontCache=new Uint8Array(await res.arrayBuffer());
                        break;
                    }
                }catch(_){}
            }
        }
        // http(s) 환경에서도 실패 시 base64 시도 (마지막 수단)
        if(!_koreanFontCache&&!isFile){
            try{
                await loadKoreanFontBase64();
                const bin=atob(window._KOREAN_FONT_BASE64);
                const arr=new Uint8Array(bin.length);
                for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i)&0xff;
                _koreanFontCache=arr;
            }catch(_){}
        }
        if(!_koreanFontCache){
            _koreanFontCache='FAIL';
            if(!_koreanFontWarned){
                _koreanFontWarned=true;
                console.warn('[free.pdf] 한글 폰트 로드 실패 — Helvetica로 대체. 한글 표시가 제한됩니다.');
            }
            return await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        }
    }
    pdfDoc.registerFontkit(fontkit);
    try{
        // subset 파이프라인이 한글 일부 글자를 누락시키는 이슈가 있어 전체 임베드 사용
        return await pdfDoc.embedFont(_koreanFontCache,{subset:false});
    }catch(e){
        console.warn('[free.pdf] 한글 폰트 임베드 실패, Helvetica fallback',e.message);
        _koreanFontCache='FAIL';
        return await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    }
}

const T=window.I18N;

// ===== Error/Warning display =====
function showError(errEl,msg){errEl.innerHTML=`${escapeHtml(msg)}<button class="error-msg-close" onclick="this.parentElement.classList.remove('show')">&times;</button>`;errEl.classList.add('show')}
function showWarn(parentEl,msg){const existing=parentEl.querySelector('.warn-msg');if(existing)existing.remove();const w=document.createElement('div');w.className='warn-msg';w.innerHTML=`${escapeHtml(msg)}<button class="warn-msg-close" onclick="this.parentElement.remove()">&times;</button>`;const target=parentEl.querySelector('.drop-zone');if(target)target.insertAdjacentElement('afterend',w);else parentEl.prepend(w)}

// ===== Helpers =====
async function loadPdf(ab){const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});if(pdf.isEncrypted)console.warn(T.consoleEncrypted);return pdf}
function formatSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function escapeHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
function parseRange(str,max){const pages=new Set();str.split(',').forEach(p=>{p=p.trim();const m=p.match(/^(\d+)\s*-\s*(\d+)$/);if(m){for(let i=Math.max(1,+m[1]);i<=Math.min(max,+m[2]);i++)pages.add(i-1)}else{const n=parseInt(p);if(n>=1&&n<=max)pages.add(n-1)}});return Array.from(pages).sort((a,b)=>a-b)}
function showComplete(statusEl,msg){statusEl.innerHTML=`${msg} <button class="completion-link" onclick="showHome()">${T.backToTools}</button>`}

const toolNames=T.toolNames;
function showHome(push=true){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById('view-home').classList.add('active');document.querySelector('header').classList.remove('collapsed');document.getElementById('breadcrumb').style.display='none';document.getElementById('breadcrumbName').style.display='none';window.scrollTo(0,0);if(push)history.pushState({view:'home'},'','#')}
function showTool(id,push=true){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById('view-'+id).classList.add('active');document.querySelector('header').classList.add('collapsed');document.getElementById('breadcrumb').style.display='';document.getElementById('breadcrumbName').style.display='';document.getElementById('breadcrumbName').textContent=toolNames[id]||id;window.scrollTo(0,0);if(push)history.pushState({view:id},'','#'+id)}
window.addEventListener('popstate',e=>{if(e.state&&e.state.view&&e.state.view!=='home')showTool(e.state.view,false);else showHome(false)});
if(location.hash&&location.hash.length>1){const id=location.hash.slice(1);if(document.getElementById('view-'+id))showTool(id,false)}
history.replaceState({view:location.hash?location.hash.slice(1):'home'},'');

function setupDropZone(dzId,fiId,cb,opts={}){
    const dz=document.getElementById(dzId),fi=document.getElementById(fiId);
    const accept=opts.accept||'application/pdf';const multi=fi.hasAttribute('multiple');
    dz.setAttribute('role','button');
    dz.setAttribute('tabindex','0');
    if(!dz.hasAttribute('aria-label'))dz.setAttribute('aria-label',(opts.accept==='image/*'?'이미지':'PDF')+' 파일 선택');
    dz.addEventListener('click',()=>fi.click());
    dz.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click()}});
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag-over')});
    dz.addEventListener('dragleave',()=>dz.classList.remove('drag-over'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag-over');
        const files=Array.from(e.dataTransfer.files);
        const valid=accept==='image/*'?files.filter(f=>f.type.startsWith('image/')):files.filter(f=>f.type===accept||f.name.toLowerCase().endsWith('.pdf'));
        const errId=dzId.replace('DropZone','Error');const errEl=document.getElementById(errId);
        if(!valid.length&&errEl){showError(errEl,T.errBadFormat(accept==='image/*'?T.fmtImage:T.fmtPdf));return}
        if(errEl)errEl.classList.remove('show');
        cb(multi?valid:[valid[0]])});
    fi.addEventListener('change',e=>{cb(Array.from(e.target.files));fi.value=''});
}
const SIZE_WARN=50*1024*1024;
function checkLargeFiles(files,viewEl){if(!viewEl)return;files.forEach(f=>{if(f.size>SIZE_WARN)showWarn(viewEl,T.largeFileWarn(f.name,formatSize(f.size)))})}

// Page thumbnail renderer with controls (select all, range input)
async function renderPageGrid(arrayBuffer,containerId,opts={}){
    const container=document.getElementById(containerId);container.innerHTML='';
    const pdf=await pdfjsLib.getDocument({data:arrayBuffer}).promise;
    const selected=new Set();const total=pdf.numPages;
    // Controls
    const ctrl=document.createElement('div');ctrl.className='page-grid-controls';
    ctrl.innerHTML=`<button class="btn btn-sm btn-secondary" data-act="all">${T.selectAll}</button><button class="btn btn-sm btn-secondary" data-act="none">${T.deselectAll}</button><input class="form-input" placeholder="${T.rangePlaceholder}" data-act="range"><button class="btn btn-sm btn-primary" data-act="apply">${T.apply}</button>`;
    container.appendChild(ctrl);
    const grid=document.createElement('div');grid.className='page-grid';container.appendChild(grid);
    const thumbs=[];
    for(let i=1;i<=total;i++){
        const page=await pdf.getPage(i);const vp=page.getViewport({scale:.25});
        const canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height;
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
        const div=document.createElement('div');div.className='page-thumb';div.dataset.idx=i-1;
        div.innerHTML=`<div class="page-thumb-check">✓</div>`;div.insertBefore(canvas,div.firstChild);
        const num=document.createElement('div');num.className='page-thumb-num';num.textContent=i+'p';div.appendChild(num);
        div.addEventListener('click',()=>{if(selected.has(i-1)){selected.delete(i-1);div.classList.remove('selected')}else{selected.add(i-1);div.classList.add('selected')};updateCount()});
        grid.appendChild(div);thumbs.push(div);
    }
    function updateCount(){const c=selected.size;if(opts.onCount)opts.onCount(c,total)}
    function setAll(on){thumbs.forEach((t,i)=>{if(on){selected.add(i);t.classList.add('selected')}else{selected.delete(i);t.classList.remove('selected')}});updateCount()}
    ctrl.querySelector('[data-act="all"]').onclick=()=>setAll(true);
    ctrl.querySelector('[data-act="none"]').onclick=()=>setAll(false);
    ctrl.querySelector('[data-act="apply"]').onclick=()=>{const v=ctrl.querySelector('[data-act="range"]').value;if(!v.trim())return;setAll(false);parseRange(v,total).forEach(i=>{selected.add(i);thumbs[i].classList.add('selected')});updateCount()};
    return()=>Array.from(selected).sort((a,b)=>a-b);
}

// ===== 1. PDF 편집 (합치기+나누기+삭제+추출+회전 통합) =====
const fileColors=['#fb7185','#fb923c','#fbbf24','#a3e635','#34d399','#2dd4bf','#22d3ee','#a78bfa','#e879f9','#f472b6'];
let editPages=[],editDragIdx=null,editSourceNames=[],editSourceFiles=[],editCancelled=new Set();

// ===== Undo/Redo 히스토리 =====
const _history={past:[],future:[],MAX:50,suspended:0};
function snapshotState(){
    return{
        editPages:editPages.map(pg=>({
            arrayBuffer:pg.arrayBuffer,
            sourceFile:pg.sourceFile,
            sourcePageIndex:pg.sourcePageIndex,
            selected:pg.selected,
            thumbCanvas:pg.thumbCanvas,
            rotation:pg.rotation,
            textBoxes:(pg.textBoxes||[]).map(b=>({...b})),
            imageBoxes:(pg.imageBoxes||[]).map(b=>({...b})),
            pageW:pg.pageW,
            pageH:pg.pageH,
            thumbDpr:pg.thumbDpr,
        })),
        editSourceNames:[...editSourceNames],
        editSourceFiles:editSourceFiles.map(f=>({...f})),
    };
}
function restoreState(snap){
    editPages=snap.editPages.map(pg=>({...pg,textBoxes:pg.textBoxes.map(b=>({...b})),imageBoxes:pg.imageBoxes.map(b=>({...b}))}));
    editSourceNames=[...snap.editSourceNames];
    editSourceFiles=snap.editSourceFiles.map(f=>({...f}));
    closeAnyOpenEditor();
    if(editPages.length){
        document.getElementById('editWorkspace').style.display='block';
        document.getElementById('editDropZone').style.display='none';
        renderEditGrid();
    }else{
        document.getElementById('editWorkspace').style.display='none';
        document.getElementById('editDropZone').style.display='';
    }
}
function pushHistory(){
    if(_history.suspended>0)return;
    _history.past.push(snapshotState());
    if(_history.past.length>_history.MAX)_history.past.shift();
    _history.future=[];
}
function undo(){
    if(!_history.past.length)return;
    _history.future.push(snapshotState());
    if(_history.future.length>_history.MAX)_history.future.shift();
    restoreState(_history.past.pop());
}
function redo(){
    if(!_history.future.length)return;
    _history.past.push(snapshotState());
    if(_history.past.length>_history.MAX)_history.past.shift();
    restoreState(_history.future.pop());
}
function clearHistory(){_history.past=[];_history.future=[]}
function closeAnyOpenEditor(){
    document.querySelectorAll('.page-preview-overlay').forEach(o=>o.remove());
}
document.addEventListener('keydown',e=>{
    const editView=document.getElementById('view-edit');
    if(!editView||!editView.classList.contains('active'))return;
    if(e.target&&(e.target.isContentEditable||e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;
    const cmd=e.metaKey||e.ctrlKey;
    if(!cmd)return;
    const k=e.key.toLowerCase();
    if(k==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
    else if(k==='y'){e.preventDefault();redo()}
});
setupDropZone('editDropZone','editFileInput',handleEditFiles);
setupDropZone('editAddDropZone','editAddFileInput',handleEditFiles);

async function handleEditFiles(files){
    const errEl=document.getElementById('editError');
    checkLargeFiles(files,document.getElementById('view-edit'));
    const willAdd=files.some(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'));
    if(willAdd&&editPages.length)pushHistory();
    for(const f of files.filter(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'))){
        let pdf=null;
        try{
            const rawBuf=await f.arrayBuffer();const ab=rawBuf.slice(0);
            pdf=await pdfjsLib.getDocument({data:ab.slice(0)}).promise;
            const fname=f.name.replace(/\.pdf$/i,'');
            if(!editSourceNames.includes(fname)){editSourceNames.push(fname);editSourceFiles.push({name:f.name,size:f.size,pageCount:pdf.numPages})}
            for(let i=0;i<pdf.numPages;i++){
                if(editCancelled.has(fname))break;
                const page=await pdf.getPage(i+1);
                const thumbDpr=Math.max(2,window.devicePixelRatio||1);
                const vp=page.getViewport({scale:THUMB_SCALE*thumbDpr});
                const baseVp=page.getViewport({scale:1});
                // PDF에 저장된 회전 메타데이터 (페이지가 가로로 저장된 후 90° 회전 등)
                const naturalRotation=baseVp.rotation||0;
                const canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height;
                await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
                if(editCancelled.has(fname))break;
                editPages.push({arrayBuffer:ab,sourceFile:fname,sourcePageIndex:i,selected:true,thumbCanvas:canvas,rotation:0,naturalRotation,textBoxes:[],imageBoxes:[],pageW:baseVp.width,pageH:baseVp.height,thumbDpr});
            }
            editCancelled.delete(fname);
        }catch(e){showError(errEl,T.errFileRead(f.name))}
        finally{if(pdf)try{await pdf.destroy()}catch(_){}}
    }
    if(editPages.length){
        document.getElementById('editDropZone').style.display='none';
        document.getElementById('editWorkspace').style.display='block';
        renderEditGrid();
    }
}

function getFileColor(fname){const idx=editSourceNames.indexOf(fname);return fileColors[idx%fileColors.length]}

function renderEditFileList(){
    const list=document.getElementById('editFileList');list.innerHTML='';
    editSourceNames.forEach((fname,i)=>{
        const color=fileColors[i%fileColors.length];
        const count=editPages.filter(p=>p.sourceFile===fname).length;
        const div=document.createElement('div');div.className='edit-file-item';
        const fileInfo=editSourceFiles[i]||{};
        const sizeStr=fileInfo.size?formatSize(fileInfo.size):'';
        const safeName=escapeHtml(fname)+'.pdf';
        div.innerHTML=`<span class="edit-file-dot" style="background:${color}"></span><div class="edit-file-info"><div class="edit-file-name" title="${safeName}">${safeName}</div><div class="edit-file-meta">${T.fileMeta(sizeStr,count)}</div></div><button class="edit-file-remove" title="${T.deleteTitle}" aria-label="${T.deleteTitle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>`;
        div.querySelector('.edit-file-info').addEventListener('click',()=>{
            pushHistory();
            // 해당 파일 페이지를 토글 (다른 파일은 영향 없음)
            const filePages=editPages.filter(p=>p.sourceFile===fname);
            const allSel=filePages.every(p=>p.selected);
            filePages.forEach(p=>p.selected=!allSel);
            renderEditGrid();
        });
        div.querySelector('.edit-file-remove').addEventListener('click',e=>{
            e.stopPropagation();
            pushHistory();
            editCancelled.add(fname);
            editPages=editPages.filter(p=>p.sourceFile!==fname);
            editSourceNames.splice(i,1);editSourceFiles.splice(i,1);
            if(!editPages.length){document.getElementById('editClearBtn').click();return}
            renderEditGrid();
        });
        list.appendChild(div);
    });
}

// 썸네일은 PDF 페이지의 0.5 스케일이라, 모든 stamp 좌표/사이즈를 0.5배로 그림
const THUMB_SCALE=0.85;

let _markImgEl=null;
async function getMarkImgElement(){
    if(!editMarkImgData){_markImgEl=null;return null}
    if(_markImgEl&&_markImgEl._fromBuf===editMarkImgData.arrayBuffer)return _markImgEl;
    const img=new Image();
    img.src=URL.createObjectURL(new Blob([editMarkImgData.arrayBuffer],{type:editMarkImgData.type}));
    await new Promise((res,rej)=>{img.onload=res;img.onerror=rej});
    img._fromBuf=editMarkImgData.arrayBuffer;
    _markImgEl=img;return img;
}

function getStampOptionsLive(){
    const pagenumOn=document.getElementById('editPagenumEnable')?.checked;
    const markOn=document.getElementById('editMarkEnable')?.checked;
    const markText=document.getElementById('editMarkText')?.value.trim();
    const markFontSize=parseInt(document.getElementById('editMarkSize')?.value)||50;
    const markLayout=document.getElementById('editMarkLayout')?.value||'diagonal';
    const markImgPos=document.getElementById('editMarkImgPos')?.value||'br';
    const markImgSize=parseInt(document.getElementById('editMarkImgSize')?.value)||100;
    return{
        pagenumOn,
        pagenumPos:document.getElementById('editPagenumPos')?.value||'bc',
        pagenumStart:parseInt(document.getElementById('editPagenumStart')?.value)||1,
        pagenumFmt:document.getElementById('editPagenumFormat')?.value||'n',
        markTextOn:markOn&&editMarkMode==='text'&&markText,
        markText,markFontSize,markLayout,
        markImgOn:markOn&&editMarkMode==='image'&&editMarkImgData,
        markImgPos,markImgSize,
    };
}

// 모달 편집 상태
const _textOpts={addMode:false,size:14,color:'#222',bold:false,underline:false,align:'left',bg:''};
const _imgCache=new Map();
function getCachedImage(dataUrl){
    let img=_imgCache.get(dataUrl);
    if(!img){img=new Image();img.src=dataUrl;_imgCache.set(dataUrl,img)}
    return img;
}
function getTextModeOptions(){
    return{textModeOn:_textOpts.addMode,textSize:_textOpts.size,textColor:_textOpts.color,textBold:_textOpts.bold,textUnderline:_textOpts.underline,textAlign:_textOpts.align,textBg:_textOpts.bg};
}

function genBoxId(){return 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

function hexToPdfRgb(hex){
    if(!hex)return{r:0,g:0,b:0};
    let h=hex.replace('#','');
    if(h.length===3)h=h.split('').map(c=>c+c).join('');
    return{r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255};
}

function drawWatermarkTextLayer(ctx,w,h,text,fontSize,layout){
    ctx.save();
    ctx.font=`bold ${fontSize}px 'Pretendard Variable',Pretendard,-apple-system,sans-serif`;
    ctx.fillStyle='rgba(128,128,128,0.2)';
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(layout==='diagonal'){ctx.translate(w/2,h/2);ctx.rotate(-Math.PI/4);ctx.fillText(text,0,0)}
    else if(layout==='horizontal'){ctx.fillText(text,w/2,h/2)}
    else if(layout==='tiled'){
        ctx.translate(w/2,h/2);ctx.rotate(-Math.PI/6);ctx.translate(-w/2,-h/2);
        const tw=ctx.measureText(text).width;
        for(let y=-h;y<h*2;y+=fontSize*3){for(let x=-w;x<w*2;x+=tw+fontSize*2){ctx.fillText(text,x,y)}}
    }
    ctx.restore();
}

function drawWatermarkImageLayer(ctx,cw,ch,img,size,pos,scale){
    const ratio=img.naturalHeight/img.naturalWidth;
    const w=size,h=size*ratio,margin=30*scale;
    let x,y;
    if(pos==='br'){x=cw-w-margin;y=ch-h-margin}
    else if(pos==='bl'){x=margin;y=ch-h-margin}
    else if(pos==='tr'){x=cw-w-margin;y=margin}
    else if(pos==='tl'){x=margin;y=margin}
    else{x=(cw-w)/2;y=(ch-h)/2}
    ctx.drawImage(img,x,y,w,h);
}

function drawPagenumLayer(ctx,cw,ch,label,pos,scale){
    ctx.save();
    const sz=10*scale;
    ctx.font=`${sz}px 'Pretendard Variable',Pretendard,sans-serif`;
    ctx.fillStyle='rgba(80,80,80,1)';ctx.textBaseline='alphabetic';
    const tw=ctx.measureText(label).width;const margin=30*scale;
    let x,y;
    if(pos==='bc'){x=(cw-tw)/2;y=ch-margin}
    else if(pos==='br'){x=cw-tw-40*scale;y=ch-margin}
    else if(pos==='bl'){x=40*scale;y=ch-margin}
    else{x=(cw-tw)/2;y=margin+sz}
    ctx.fillText(label,x,y);
    ctx.restore();
}

function drawImageBoxesLayer(ctx,scale,boxes){
    if(!boxes||!boxes.length)return;
    boxes.forEach(b=>{
        const img=getCachedImage(b.dataUrl);
        if(img.complete&&img.naturalWidth){
            ctx.drawImage(img,b.x*scale,b.y*scale,b.w*scale,b.h*scale);
        }
    });
}
function drawTextBoxesLayer(ctx,scale,boxes){
    if(!boxes||!boxes.length)return;
    boxes.forEach(b=>{
        ctx.save();
        const sz=b.size*scale;
        const fw=b.bold?'bold ':'';
        ctx.font=`${fw}${sz}px 'Pretendard Variable',Pretendard,sans-serif`;
        ctx.textBaseline='top';
        const lines=(b.text||'').split('\n');
        const lineH=b.size*1.2;
        const widths=lines.map(l=>ctx.measureText(l).width);
        const maxW=Math.max(0,...widths);
        const totalH=lineH*lines.length*scale;
        // 배경
        if(b.bg){
            const padX=4*scale,padY=2*scale;
            ctx.fillStyle=b.bg;
            ctx.fillRect(b.x*scale-padX,b.y*scale-padY,maxW+padX*2,totalH+padY*2);
        }
        // 텍스트 (정렬은 박스 폭 기준)
        ctx.fillStyle=b.color||'#222';
        const align=b.align||'left';
        lines.forEach((line,idx)=>{
            const lineW=widths[idx];
            let xPos=b.x*scale;
            if(align==='center')xPos+=(maxW-lineW)/2;
            else if(align==='right')xPos+=(maxW-lineW);
            const yPos=(b.y+idx*lineH)*scale;
            ctx.fillText(line,xPos,yPos);
            // 밑줄
            if(b.underline&&line.length){
                const ulY=yPos+sz*1.05;
                ctx.fillRect(xPos,ulY,lineW,Math.max(1,sz*0.06));
            }
        });
        ctx.restore();
    });
}

function applyStampOverlays(ctx,w,h,opts,scale,pageIndex){
    if(!opts)return;
    if(opts.markTextOn){drawWatermarkTextLayer(ctx,w,h,opts.markText,opts.markFontSize*scale,opts.markLayout)}
    if(opts.markImgOn&&opts.markImgEl){drawWatermarkImageLayer(ctx,w,h,opts.markImgEl,opts.markImgSize*scale,opts.markImgPos,scale)}
    if(opts.pagenumOn&&pageIndex!=null){
        const num=opts.pagenumStart+pageIndex;
        const sel=editPages.filter(p=>p.selected).length;
        const total=sel+opts.pagenumStart-1;
        let label;if(opts.pagenumFmt==='n')label=String(num);else if(opts.pagenumFmt==='dash')label=`- ${num} -`;else label=`${num}/${total}`;
        drawPagenumLayer(ctx,w,h,label,opts.pagenumPos,scale);
    }
}

function renderThumbCanvas(pg,opts,pageIndex){
    const src=pg.thumbCanvas;const rot=pg.rotation%360;
    const swap=rot===90||rot===270;
    const w=swap?src.height:src.width;const h=swap?src.width:src.height;
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d');
    ctx.save();
    ctx.translate(w/2,h/2);ctx.rotate(rot*Math.PI/180);
    ctx.drawImage(src,-src.width/2,-src.height/2);
    ctx.restore();
    const renderScale=THUMB_SCALE*(pg.thumbDpr||1);
    drawImageBoxesLayer(ctx,renderScale,pg.imageBoxes);
    applyStampOverlays(ctx,w,h,opts,renderScale,pageIndex);
    drawTextBoxesLayer(ctx,renderScale,pg.textBoxes);
    return c;
}

const MODAL_SCALE=1.5;

// 모달 편집 툴바 DOM (순수 빌더 — 클로저 의존 없음)
function buildModalTextToolbar(addModeActive){
    const toolbar=document.createElement('div');toolbar.className='modal-text-toolbar';
    const colorOpts=T.modalColorOptions.map(o=>`<option value="${o.v}" data-swatch="${o.v}">${o.t}</option>`).join('');
    const bgOpts=T.modalBgOptions.map(o=>`<option value="${o.v}">${o.t}</option>`).join('');
    toolbar.innerHTML=`
        <button class="modal-tb-add-btn" data-act="toggle-add">${addModeActive?T.modalAddTextActive:T.modalAddText}</button>
        <button class="modal-tb-add-btn" data-act="add-image">${T.modalAddImage}</button>
        <span class="modal-tb-divider modal-tb-format-grp"></span>
        <input class="modal-tb-num modal-tb-format-grp" type="number" min="6" max="96" step="1" data-field="size" title="${T.modalSizeLabel}">
        <select class="modal-tb-select modal-tb-format-grp" data-field="color" title="${T.modalColorLabel}">${colorOpts}</select>
        <input class="modal-tb-color-picker modal-tb-format-grp" type="color" data-field="colorpicker" title="${T.modalColorPickerTitle}" value="#222222">
        <button class="modal-tb-icon-btn modal-tb-format-grp" data-field="bold" title="${T.modalBoldTitle}"><b>B</b></button>
        <button class="modal-tb-icon-btn modal-tb-format-grp" data-field="underline" title="${T.modalUnderlineTitle}"><span style="text-decoration:underline">U</span></button>
        <span class="modal-tb-divider modal-tb-format-grp"></span>
        <button class="modal-tb-icon-btn modal-tb-format-grp" data-field="align" data-val="left" title="${T.modalAlignLeftTitle}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg></button>
        <button class="modal-tb-icon-btn modal-tb-format-grp" data-field="align" data-val="center" title="${T.modalAlignCenterTitle}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg></button>
        <button class="modal-tb-icon-btn modal-tb-format-grp" data-field="align" data-val="right" title="${T.modalAlignRightTitle}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg></button>
        <span class="modal-tb-divider modal-tb-format-grp"></span>
        <select class="modal-tb-select modal-tb-format-grp" data-field="bg" title="${T.modalBgLabel}">${bgOpts}</select>
        <input class="modal-tb-color-picker modal-tb-format-grp" type="color" data-field="bgpicker" title="${T.modalBgPickerTitle}" value="#ffffff">
        <span class="modal-tb-divider modal-tb-boxalign-grp" style="display:none"></span>
        <button class="modal-tb-icon-btn modal-tb-boxalign-grp" data-boxalign="left" title="${T.boxAlignLeftTitle}" style="display:none"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="2" x2="2" y2="14"/><rect x="4" y="4" width="8" height="3"/><rect x="4" y="9" width="5" height="3"/></svg></button>
        <button class="modal-tb-icon-btn modal-tb-boxalign-grp" data-boxalign="centerH" title="${T.boxAlignCenterHTitle}" style="display:none"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="8" y1="2" x2="8" y2="14" stroke-dasharray="2 1.5"/><rect x="4" y="4" width="8" height="3"/><rect x="5.5" y="9" width="5" height="3"/></svg></button>
        <button class="modal-tb-icon-btn modal-tb-boxalign-grp" data-boxalign="right" title="${T.boxAlignRightTitle}" style="display:none"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="14" y1="2" x2="14" y2="14"/><rect x="4" y="4" width="8" height="3"/><rect x="7" y="9" width="5" height="3"/></svg></button>
        <button class="modal-tb-icon-btn modal-tb-boxalign-grp" data-boxalign="top" title="${T.boxAlignTopTitle}" style="display:none"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="2" x2="14" y2="2"/><rect x="4" y="4" width="3" height="8"/><rect x="9" y="4" width="3" height="5"/></svg></button>
        <button class="modal-tb-icon-btn modal-tb-boxalign-grp" data-boxalign="centerV" title="${T.boxAlignCenterVTitle}" style="display:none"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="8" x2="14" y2="8" stroke-dasharray="2 1.5"/><rect x="4" y="4" width="3" height="8"/><rect x="9" y="5.5" width="3" height="5"/></svg></button>
        <button class="modal-tb-icon-btn modal-tb-boxalign-grp" data-boxalign="bottom" title="${T.boxAlignBottomTitle}" style="display:none"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="2" y1="14" x2="14" y2="14"/><rect x="4" y="4" width="3" height="8"/><rect x="9" y="7" width="3" height="5"/></svg></button>
        <span class="modal-tb-hint"></span>
    `;
    return toolbar;
}

async function openPageEditor(pg){
    // ===== 1. PDF 페이지 렌더 (캔버스에 stamp 합성) =====
    const opts=getStampOptionsLive();
    if(opts.markImgOn){opts.markImgEl=await getMarkImgElement().catch(()=>null)}
    const pdf=await pdfjsLib.getDocument({data:pg.arrayBuffer.slice(0)}).promise;
    const page=await pdf.getPage(pg.sourcePageIndex+1);
    // PDF 자체 회전(메타데이터) + 사용자 회전 모두 합쳐 적용
    const rot=((pg.naturalRotation||0)+pg.rotation)%360;
    // 화면 표시는 MODAL_SCALE, 실제 캔버스 픽셀은 dpr*2 boost로 선명도 확보
    const dpr=window.devicePixelRatio||1;
    const sharpness=Math.max(2,dpr);
    const renderScale=MODAL_SCALE*sharpness;
    const displayVp=page.getViewport({scale:MODAL_SCALE,rotation:rot});
    const vp=page.getViewport({scale:renderScale,rotation:rot});
    const bigCanvas=document.createElement('canvas');
    bigCanvas.width=vp.width;bigCanvas.height=vp.height;
    bigCanvas.style.width=displayVp.width+'px';
    bigCanvas.style.height=displayVp.height+'px';
    const ctx=bigCanvas.getContext('2d');
    await page.render({canvasContext:ctx,viewport:vp}).promise;
    // 페이지 렌더 끝나면 pdf.js 핸들 즉시 해제 (워커 메모리 회수)
    try{await pdf.destroy()}catch(_){}
    const selectedPages=editPages.filter(p=>p.selected);
    const pageIndex=pg.selected?selectedPages.indexOf(pg):null;
    applyStampOverlays(ctx,vp.width,vp.height,opts,renderScale,pageIndex);

    // ===== 2. 모달 컨테이너 + 닫기 버튼 + 툴바 =====
    const overlay=document.createElement('div');overlay.className='page-preview-overlay';
    const closeBtn=document.createElement('span');closeBtn.className='page-preview-close';closeBtn.innerHTML='&times;';
    overlay.appendChild(closeBtn);
    const toolbar=buildModalTextToolbar(_textOpts.addMode);
    overlay.appendChild(toolbar);

    // ===== 3. 박스 선택/포커스 상태 =====
    // 현재 포커스된 박스 추적 (또는 null이면 _textOpts에 적용)
    let _focusedBox=null;
    const _multiSel=new Set();  // 다중 선택된 박스들 (Shift+클릭)
    const tbSize=toolbar.querySelector('[data-field="size"]');
    const tbColor=toolbar.querySelector('[data-field="color"]');
    const tbColorPicker=toolbar.querySelector('[data-field="colorpicker"]');
    const tbBg=toolbar.querySelector('[data-field="bg"]');
    const tbBgPicker=toolbar.querySelector('[data-field="bgpicker"]');
    const tbBold=toolbar.querySelector('[data-field="bold"]');
    const tbUnderline=toolbar.querySelector('[data-field="underline"]');
    const tbAlignBtns=toolbar.querySelectorAll('[data-field="align"]');
    function isHexInOptions(hex,opts){return opts.some(o=>o.v===hex)}
    function syncToolbarFromOpts(o){
        tbSize.value=String(o.size);
        // select에 있는 색이면 select, 아니면 picker만 업데이트
        if(isHexInOptions(o.color,T.modalColorOptions))tbColor.value=o.color;else tbColor.value='';
        tbColorPicker.value=(o.color&&o.color.startsWith('#')&&o.color.length===7)?o.color:'#222222';
        if(isHexInOptions(o.bg||'',T.modalBgOptions))tbBg.value=o.bg||'';else tbBg.value='';
        tbBgPicker.value=(o.bg&&o.bg.startsWith('#')&&o.bg.length===7)?o.bg:'#ffffff';
        tbBold.classList.toggle('active',!!o.bold);
        tbUnderline.classList.toggle('active',!!o.underline);
        tbAlignBtns.forEach(b=>b.classList.toggle('active',b.dataset.val===(o.align||'left')));
    }
    function getActiveTargets(){
        // 다중 선택이 있으면 그 셋, 없으면 _focusedBox 단일, 없으면 _textOpts
        if(_multiSel.size)return Array.from(_multiSel);
        if(_focusedBox)return [_focusedBox];
        return [_textOpts];
    }
    function refreshBoxDom(box){
        const el=textLayer.querySelector(`.page-text-box[data-id="${box.id}"]`);
        if(el)applyBoxStyleToEl(el,box);
    }
    const _measureCanvas=document.createElement('canvas');
    const _measureCtx=_measureCanvas.getContext('2d');
    function getBoxWidth(box){
        const fw=box.bold?'bold ':'';
        _measureCtx.font=`${fw}${box.size}px 'Pretendard Variable',sans-serif`;
        const lines=(box.text||'').split('\n');
        return Math.max(0,...lines.map(l=>_measureCtx.measureText(l).width));
    }
    function getBoxHeight(box){
        const lines=(box.text||'').split('\n');
        return box.size*1.2*Math.max(1,lines.length);
    }
    const boxAlignBtns=toolbar.querySelectorAll('.modal-tb-boxalign-grp');
    const formatGrp=toolbar.querySelectorAll('.modal-tb-format-grp');
    function refreshBoxAlignVisibility(){
        const show=_multiSel.size>=2;
        boxAlignBtns.forEach(el=>el.style.display=show?'':'none');
    }
    function refreshFormatVisibility(){
        // 서식 옵션은 addMode ON 또는 박스 선택 시에만 표시
        const show=_textOpts.addMode||_focusedBox||_multiSel.size>0;
        formatGrp.forEach(el=>el.style.display=show?'':'none');
    }
    function clearMultiSel(){
        _multiSel.clear();
        textLayer.querySelectorAll('.page-text-box.multi-selected').forEach(el=>el.classList.remove('multi-selected'));
        refreshBoxAlignVisibility();
        refreshFormatVisibility();
    }
    function toggleMultiSel(box,el){
        if(_multiSel.has(box)){
            _multiSel.delete(box);
            el.classList.remove('multi-selected');
        }else{
            _multiSel.add(box);
            el.classList.add('multi-selected');
            syncToolbarFromOpts(box);
        }
        refreshBoxAlignVisibility();
        refreshFormatVisibility();
    }
    function alignBoxes(mode){
        const boxes=Array.from(_multiSel);
        if(boxes.length<2)return;
        pushHistory();
        const widths=boxes.map(getBoxWidth);
        const heights=boxes.map(getBoxHeight);
        const lefts=boxes.map(b=>b.x);
        const rights=boxes.map((b,i)=>b.x+widths[i]);
        const tops=boxes.map(b=>b.y);
        const bottoms=boxes.map((b,i)=>b.y+heights[i]);
        if(mode==='left'){const m=Math.min(...lefts);boxes.forEach(b=>b.x=m)}
        else if(mode==='right'){const m=Math.max(...rights);boxes.forEach((b,i)=>b.x=m-widths[i])}
        else if(mode==='centerH'){const c=(Math.min(...lefts)+Math.max(...rights))/2;boxes.forEach((b,i)=>b.x=c-widths[i]/2)}
        else if(mode==='top'){const m=Math.min(...tops);boxes.forEach(b=>b.y=m)}
        else if(mode==='bottom'){const m=Math.max(...bottoms);boxes.forEach((b,i)=>b.y=m-heights[i])}
        else if(mode==='centerV'){const c=(Math.min(...tops)+Math.max(...bottoms))/2;boxes.forEach((b,i)=>b.y=c-heights[i]/2)}
        boxes.forEach(refreshBoxDom);
    }
    boxAlignBtns.forEach(btn=>{
        if(btn.dataset.boxalign){
            btn.addEventListener('click',e=>{e.stopPropagation();alignBoxes(btn.dataset.boxalign)});
        }
    });
    function applyFieldChange(field,value){
        const targets=getActiveTargets();
        const affectsBox=targets.some(t=>t!==_textOpts);
        if(affectsBox)pushHistory();
        targets.forEach(t=>{
            t[field]=value;
            if(t!==_textOpts)refreshBoxDom(t);
        });
    }

    // ===== 4. 캔버스 wrap + 텍스트/이미지 레이어 =====
    const wrap=document.createElement('div');wrap.className='page-editor-wrap';
    wrap.appendChild(bigCanvas);
    const imageLayer=document.createElement('div');imageLayer.className='page-editor-imagelayer';
    wrap.appendChild(imageLayer);
    const textLayer=document.createElement('div');textLayer.className='page-editor-textlayer';
    wrap.appendChild(textLayer);
    overlay.appendChild(wrap);
    const note=document.createElement('div');note.className='modal-preview-note';note.textContent=T.modalPreviewNote;
    overlay.appendChild(note);

    // 툴바 인터랙션
    const addBtn=toolbar.querySelector('[data-act="toggle-add"]');
    const hintEl=toolbar.querySelector('.modal-tb-hint');
    function refreshAddBtn(){
        addBtn.textContent=_textOpts.addMode?T.modalAddTextActive:T.modalAddText;
        addBtn.classList.toggle('active',_textOpts.addMode);
        hintEl.textContent=_textOpts.addMode?T.modalTextHint:'';
        bigCanvas.style.cursor=_textOpts.addMode?'text':'default';
        refreshFormatVisibility();
    }
    addBtn.addEventListener('click',e=>{e.stopPropagation();_textOpts.addMode=!_textOpts.addMode;refreshAddBtn()});
    const addImageBtn=toolbar.querySelector('[data-act="add-image"]');
    addImageBtn.addEventListener('click',e=>{
        e.stopPropagation();
        const fi=document.createElement('input');
        fi.type='file';fi.accept='image/png,image/jpeg';
        fi.addEventListener('change',ev=>{
            const f=ev.target.files[0];if(!f)return;
            const reader=new FileReader();
            reader.onload=()=>{
                const img=new Image();
                img.onload=()=>{
                    // 페이지 가운데, 기본 너비 200pt (또는 페이지 폭의 30% 중 작은 값)
                    const baseW=Math.min(200,pg.pageW*0.3);
                    const ratio=img.naturalHeight/img.naturalWidth;
                    const w=baseW,h=baseW*ratio;
                    pushHistory();
                    const ibox={id:genBoxId(),dataUrl:reader.result,x:(pg.pageW-w)/2,y:(pg.pageH-h)/2,w,h,naturalW:img.naturalWidth,naturalH:img.naturalHeight};
                    pg.imageBoxes.push(ibox);
                    _imgCache.set(reader.result,img);
                    imageLayer.appendChild(makeImageBoxEl(ibox));
                    scheduleThumbRedraw();
                };
                img.src=reader.result;
            };
            reader.readAsDataURL(f);
        });
        fi.click();
    });
    tbSize.addEventListener('input',e=>{
        let v=parseInt(e.target.value);
        if(!v||isNaN(v))return;
        v=Math.max(6,Math.min(96,v));
        applyFieldChange('size',v);
    });
    tbColor.addEventListener('change',e=>{if(e.target.value){applyFieldChange('color',e.target.value);tbColorPicker.value=e.target.value}});
    tbColorPicker.addEventListener('input',e=>{applyFieldChange('color',e.target.value);if(isHexInOptions(e.target.value,T.modalColorOptions))tbColor.value=e.target.value;else tbColor.value=''});
    tbBg.addEventListener('change',e=>{applyFieldChange('bg',e.target.value);if(e.target.value)tbBgPicker.value=e.target.value});
    tbBgPicker.addEventListener('input',e=>{applyFieldChange('bg',e.target.value);if(isHexInOptions(e.target.value,T.modalBgOptions))tbBg.value=e.target.value;else tbBg.value=''});
    tbBold.addEventListener('click',e=>{
        e.stopPropagation();
        const targets=getActiveTargets();
        const newVal=!targets[0].bold;
        applyFieldChange('bold',newVal);
        tbBold.classList.toggle('active',newVal);
    });
    tbUnderline.addEventListener('click',e=>{
        e.stopPropagation();
        const targets=getActiveTargets();
        const newVal=!targets[0].underline;
        applyFieldChange('underline',newVal);
        tbUnderline.classList.toggle('active',newVal);
    });
    tbAlignBtns.forEach(btn=>btn.addEventListener('click',e=>{
        e.stopPropagation();
        applyFieldChange('align',btn.dataset.val);
        tbAlignBtns.forEach(b=>b.classList.toggle('active',b===btn));
    }));
    toolbar.addEventListener('click',e=>e.stopPropagation());
    syncToolbarFromOpts(_textOpts);

    if(!pg.textBoxes)pg.textBoxes=[];
    if(!pg.imageBoxes)pg.imageBoxes=[];

    // ===== 5. 이미지 박스 DOM 빌더 + 인터랙션 =====
    function makeImageBoxEl(ibox){
        const el=document.createElement('div');
        el.className='page-image-box';
        el.dataset.id=ibox.id;
        function applyStyle(){
            el.style.left=(ibox.x*MODAL_SCALE)+'px';
            el.style.top=(ibox.y*MODAL_SCALE)+'px';
            el.style.width=(ibox.w*MODAL_SCALE)+'px';
            el.style.height=(ibox.h*MODAL_SCALE)+'px';
        }
        applyStyle();
        const img=document.createElement('img');
        img.src=ibox.dataUrl;img.draggable=false;img.alt='';
        el.appendChild(img);
        const del=document.createElement('span');
        del.className='page-image-box-del';del.textContent='✕';del.title=T.modalImageDelTitle;
        del.addEventListener('pointerdown',e=>{
            e.preventDefault();e.stopPropagation();
            pushHistory();
            const i=pg.imageBoxes.indexOf(ibox);if(i>=0)pg.imageBoxes.splice(i,1);
            el.remove();scheduleThumbRedraw();
        });
        el.appendChild(del);
        const resize=document.createElement('span');
        resize.className='page-image-box-resize';resize.title=T.modalImageResizeTitle;
        el.appendChild(resize);
        let drag=null;
        function onMove(e){
            if(!drag)return;
            const dx=(e.clientX-drag.mx)/MODAL_SCALE;
            const dy=(e.clientY-drag.my)/MODAL_SCALE;
            if(!drag.moved&&Math.hypot(dx,dy)<3)return;
            if(!drag.moved)pushHistory();
            drag.moved=true;
            if(drag.mode==='move'){
                ibox.x=Math.max(0,drag.bx+dx);
                ibox.y=Math.max(0,drag.by+dy);
            }else if(drag.mode==='resize'){
                const ratio=ibox.naturalH/ibox.naturalW;
                let nw=Math.max(20,drag.bw+dx);
                ibox.w=nw;ibox.h=nw*ratio;
            }
            applyStyle();
        }
        function onUp(){
            document.removeEventListener('pointermove',onMove);
            document.removeEventListener('pointerup',onUp);
            document.removeEventListener('pointercancel',onUp);
            drag=null;scheduleThumbRedraw();
        }
        el.addEventListener('pointerdown',e=>{
            if(e.target===del||e.target===resize)return;
            e.preventDefault();e.stopPropagation();
            drag={mode:'move',mx:e.clientX,my:e.clientY,bx:ibox.x,by:ibox.y,moved:false};
            document.addEventListener('pointermove',onMove);
            document.addEventListener('pointerup',onUp);
            document.addEventListener('pointercancel',onUp);
        });
        resize.addEventListener('pointerdown',e=>{
            e.preventDefault();e.stopPropagation();
            drag={mode:'resize',mx:e.clientX,my:e.clientY,bw:ibox.w,bh:ibox.h,moved:false};
            document.addEventListener('pointermove',onMove);
            document.addEventListener('pointerup',onUp);
            document.addEventListener('pointercancel',onUp);
        });
        return el;
    }
    pg.imageBoxes.forEach(b=>imageLayer.appendChild(makeImageBoxEl(b)));
    // ===== 6. 텍스트 박스 DOM 빌더 + 인터랙션 =====
    function applyBoxStyleToEl(el,box){
        el.style.left=(box.x*MODAL_SCALE)+'px';
        el.style.top=(box.y*MODAL_SCALE)+'px';
        el.style.fontSize=(box.size*MODAL_SCALE)+'px';
        el.style.color=box.color||'#222';
        el.style.fontWeight=box.bold?'bold':'normal';
        el.style.textDecoration=box.underline?'underline':'none';
        el.style.textAlign=box.align||'left';
        el.style.backgroundColor=box.bg||'';
    }
    function makeBoxEl(box){
        const el=document.createElement('div');
        el.className='page-text-box';
        el.dataset.id=box.id;
        applyBoxStyleToEl(el,box);
        const content=document.createElement('div');
        content.className='page-text-box-content';
        content.contentEditable='true';
        content.textContent=box.text||'';
        el.appendChild(content);
        const del=document.createElement('span');
        del.className='page-text-box-del';del.textContent='✕';
        del.addEventListener('pointerdown',e=>{
            e.preventDefault();e.stopPropagation();
            pushHistory();
            const i=pg.textBoxes.indexOf(box);if(i>=0)pg.textBoxes.splice(i,1);
            if(_focusedBox===box)_focusedBox=null;
            el.remove();
        });
        el.appendChild(del);
        const grip=document.createElement('span');
        grip.className='page-text-box-grip';grip.textContent='⤧';
        let drag=null;
        function onMove(e){
            if(!drag)return;
            const dx=(e.clientX-drag.mx)/MODAL_SCALE;
            const dy=(e.clientY-drag.my)/MODAL_SCALE;
            if(!drag.moved&&Math.hypot(dx,dy)<3)return;
            if(!drag.moved)pushHistory();
            drag.moved=true;el.classList.add('dragging');
            box.x=Math.max(0,drag.bx+dx);box.y=Math.max(0,drag.by+dy);
            el.style.left=(box.x*MODAL_SCALE)+'px';
            el.style.top=(box.y*MODAL_SCALE)+'px';
        }
        function onUp(e){
            const wasDrag=drag&&drag.moved;
            const target=drag&&drag.target;const ptrId=drag&&drag.ptrId;
            if(drag)el.classList.remove('dragging');
            drag=null;
            if(target&&ptrId!=null&&target.releasePointerCapture)try{target.releasePointerCapture(ptrId)}catch(_){}
            document.removeEventListener('pointermove',onMove);
            document.removeEventListener('pointerup',onUp);
            document.removeEventListener('pointercancel',onUp);
            if(!wasDrag){
                content.focus();
                const range=document.createRange();range.selectNodeContents(content);range.collapse(false);
                const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
            }
        }
        function startDrag(e,target){
            if(target.setPointerCapture)try{target.setPointerCapture(e.pointerId)}catch(_){}
            drag={mx:e.clientX,my:e.clientY,bx:box.x,by:box.y,moved:false,target,ptrId:e.pointerId};
            document.addEventListener('pointermove',onMove);
            document.addEventListener('pointerup',onUp);
            document.addEventListener('pointercancel',onUp);
        }
        // 좌상단 핸들 — focus 여부 무관하게 드래그 가능
        grip.addEventListener('pointerdown',e=>{
            e.preventDefault();e.stopPropagation();
            if(e.shiftKey){toggleMultiSel(box,el);return}
            clearMultiSel();
            _focusedBox=box;syncToolbarFromOpts(box);refreshFormatVisibility();
            startDrag(e,grip);
        });
        el.appendChild(grip);
        el.addEventListener('pointerdown',e=>{
            if(e.target===del||e.target===content||content.contains(e.target))return;
            if(document.activeElement===content)return;
            e.preventDefault();e.stopPropagation();
            if(e.shiftKey){toggleMultiSel(box,el);return}
            clearMultiSel();
            _focusedBox=box;syncToolbarFromOpts(box);refreshFormatVisibility();
            startDrag(e,el);
        });
        // 본문 클릭: 포커스 안 됐을 땐 드래그 우선, 포커스 됐으면 정상 텍스트 선택
        content.addEventListener('pointerdown',e=>{
            if(document.activeElement===content)return;
            e.preventDefault();e.stopPropagation();
            if(e.shiftKey){toggleMultiSel(box,el);return}
            clearMultiSel();
            _focusedBox=box;syncToolbarFromOpts(box);refreshFormatVisibility();
            startDrag(e,content);
        });
        content.addEventListener('focus',()=>{
            _focusedBox=box;
            syncToolbarFromOpts(box);
            refreshFormatVisibility();
        });
        content.addEventListener('input',()=>{box.text=content.textContent});
        content.addEventListener('blur',()=>{
            box.text=content.textContent;
            // 빈 박스 자동 삭제는 close 시점으로 미룸 (툴바 클릭 시 박스 살아있어야 색/굵기/정렬 적용 가능)
        });
        content.addEventListener('keydown',e=>{
            if(e.key==='Escape'){e.preventDefault();content.blur();return}
            // Ctrl/Cmd + D → 박스 복제 (오프셋 위치)
            if((e.ctrlKey||e.metaKey)&&(e.key==='d'||e.key==='D')){
                e.preventDefault();
                pushHistory();
                const offset=20;
                const newBox={id:genBoxId(),text:box.text||content.textContent,x:box.x+offset,y:box.y+offset,size:box.size,color:box.color,bold:box.bold,underline:box.underline,align:box.align,bg:box.bg};
                pg.textBoxes.push(newBox);
                const newEl=makeBoxEl(newBox);
                textLayer.appendChild(newEl);
                const newContent=newEl.querySelector('.page-text-box-content');
                if(newContent){newContent.focus();const r=document.createRange();r.selectNodeContents(newContent);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r)}
                return;
            }
            // Ctrl/Cmd + Backspace → 박스 삭제
            if((e.ctrlKey||e.metaKey)&&(e.key==='Backspace'||e.key==='Delete')){
                e.preventDefault();
                pushHistory();
                const i=pg.textBoxes.indexOf(box);if(i>=0)pg.textBoxes.splice(i,1);
                el.remove();
                return;
            }
            e.stopPropagation();
        });
        return el;
    }
    pg.textBoxes.forEach(b=>textLayer.appendChild(makeBoxEl(b)));

    // ===== 7. 캔버스 클릭 → 텍스트 박스 추가 (addMode) / 박스 선택 해제 =====
    bigCanvas.addEventListener('click',e=>{
        if(!_textOpts.addMode){
            // addMode 아닐 때: 빈 영역 클릭 = 박스 선택 해제
            _focusedBox=null;
            clearMultiSel();
            syncToolbarFromOpts(_textOpts);
            refreshFormatVisibility();
            return;
        }
        const rect=bigCanvas.getBoundingClientRect();
        const cx=(e.clientX-rect.left)/MODAL_SCALE;
        const cy=(e.clientY-rect.top)/MODAL_SCALE;
        pushHistory();
        const box={id:genBoxId(),text:'',x:cx,y:cy,size:_textOpts.size,color:_textOpts.color,bold:_textOpts.bold,underline:_textOpts.underline,align:_textOpts.align,bg:_textOpts.bg};
        pg.textBoxes.push(box);
        const el=makeBoxEl(box);
        textLayer.appendChild(el);
        const content=el.querySelector('.page-text-box-content');
        if(content){
            content.focus();
            const range=document.createRange();range.selectNodeContents(content);range.collapse(false);
            const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
        }
    });
    refreshAddBtn();

    // ===== 8. 모달 닫기 + 페이지 좌우 네비게이션 =====
    function close(){
        // 모든 박스 blur (텍스트 동기화)
        textLayer.querySelectorAll('.page-text-box-content').forEach(c=>{
            if(document.activeElement===c)c.blur();
        });
        // 빈 박스 일괄 정리 (자동, undo 대상 아님)
        if(pg.textBoxes&&pg.textBoxes.length){
            _history.suspended++;
            try{
                for(let i=pg.textBoxes.length-1;i>=0;i--){
                    if(!pg.textBoxes[i].text||!pg.textBoxes[i].text.trim()){
                        pg.textBoxes.splice(i,1);
                    }
                }
            }finally{_history.suspended--}
        }
        _focusedBox=null;
        _textOpts.addMode=false;
        overlay.remove();
        document.removeEventListener('keydown',onKey);
        scheduleThumbRedraw();
    }
    // 페이지 네비게이션 (좌우 화살표)
    const curIdx=editPages.indexOf(pg);
    async function navigate(delta){
        const newIdx=curIdx+delta;
        if(newIdx<0||newIdx>=editPages.length)return;
        // 옛 overlay 정리(textBoxes 동기화 + 빈 박스 제거)만 하고 overlay는 유지
        textLayer.querySelectorAll('.page-text-box-content').forEach(c=>{
            if(document.activeElement===c)c.blur();
        });
        if(pg.textBoxes&&pg.textBoxes.length){
            for(let i=pg.textBoxes.length-1;i>=0;i--){
                if(!pg.textBoxes[i].text||!pg.textBoxes[i].text.trim()){
                    pg.textBoxes.splice(i,1);
                }
            }
        }
        _focusedBox=null;_textOpts.addMode=false;
        document.removeEventListener('keydown',onKey);
        const oldOverlay=overlay;
        await openPageEditor(editPages[newIdx]);
        oldOverlay.remove();
        scheduleThumbRedraw();
    }
    const prevBtn=document.createElement('span');prevBtn.className='page-preview-nav page-preview-prev';prevBtn.innerHTML='‹';
    if(curIdx<=0)prevBtn.classList.add('disabled');
    prevBtn.addEventListener('click',e=>{e.stopPropagation();if(!prevBtn.classList.contains('disabled'))navigate(-1)});
    overlay.appendChild(prevBtn);
    const nextBtn=document.createElement('span');nextBtn.className='page-preview-nav page-preview-next';nextBtn.innerHTML='›';
    if(curIdx>=editPages.length-1)nextBtn.classList.add('disabled');
    nextBtn.addEventListener('click',e=>{e.stopPropagation();if(!nextBtn.classList.contains('disabled'))navigate(1)});
    overlay.appendChild(nextBtn);
    function onKey(e){
        const inEditable=e.target.closest('.page-text-box')||e.target.matches('input,select,textarea');
        if(e.key==='Escape'&&!e.target.closest('.page-text-box')){close();return}
        if(inEditable)return;
        if(e.key==='ArrowLeft')navigate(-1);
        else if(e.key==='ArrowRight')navigate(1);
    }
    closeBtn.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    document.addEventListener('keydown',onKey);
    document.body.appendChild(overlay);
}

let _redrawTimer=null;
async function redrawAllThumbs(){
    const grid=document.getElementById('editPageGrid');if(!grid)return;
    const opts=getStampOptionsLive();
    if(opts.markImgOn){opts.markImgEl=await getMarkImgElement().catch(()=>null)}
    const selectedPages=editPages.filter(p=>p.selected);
    const thumbs=grid.querySelectorAll('.page-thumb');
    thumbs.forEach((thumb,i)=>{
        const pg=editPages[i];if(!pg)return;
        const selIdx=pg.selected?selectedPages.indexOf(pg):-1;
        const pageIndex=selIdx>=0?selIdx:null;
        const newC=renderThumbCanvas(pg,opts,pageIndex);
        const oldC=thumb.querySelector('canvas');
        if(oldC)oldC.replaceWith(newC);
    });
}
function scheduleThumbRedraw(){
    clearTimeout(_redrawTimer);
    _redrawTimer=setTimeout(redrawAllThumbs,200);
}

function renderEditGrid(){
    const grid=document.getElementById('editPageGrid');grid.innerHTML='';
    const sidebar=document.querySelector('.edit-sidebar');
    if(sidebar)sidebar.style.display=editSourceNames.length>1?'':'none';
    if(editSourceNames.length>1)renderEditFileList();
    editPages.forEach((pg,i)=>{
        const color=getFileColor(pg.sourceFile);
        const div=document.createElement('div');div.className='page-thumb'+(pg.selected?' selected':'');div.draggable=true;
        div.style.borderColor=pg.selected?color:'';
        div.setAttribute('role','checkbox');
        div.setAttribute('tabindex','0');
        div.setAttribute('aria-checked',pg.selected?'true':'false');
        div.setAttribute('aria-label',`${i+1}페이지`);
        div.innerHTML=`<div class="page-thumb-check" style="background:${color}">✓</div><div class="page-thumb-actions"><button class="page-thumb-btn" data-act="rotate" title="${T.rotateTitle}" aria-label="${T.rotateTitle}">↻</button><button class="page-thumb-btn" data-act="preview" title="${T.previewTitle}" aria-label="${T.previewTitle}">⤢</button><button class="page-thumb-btn page-thumb-btn-del" data-act="delete" title="${T.deletePageTitle}" aria-label="${T.deletePageTitle}">✕</button></div><div class="page-thumb-color" style="background:${color}"></div>`;
        const c=renderThumbCanvas(pg);
        div.insertBefore(c,div.firstChild);
        const num=document.createElement('div');num.className='page-thumb-num';num.textContent=(i+1)+'p';div.appendChild(num);
        div.querySelector('[data-act="rotate"]').addEventListener('click',e=>{
            e.stopPropagation();
            pushHistory();
            // 회전 전 페이지 크기 (현재 보이는 방향 기준)
            const rotBefore=pg.rotation%360;
            const swapped=rotBefore===90||rotBefore===270;
            const oldW=swapped?pg.pageH:pg.pageW;
            const oldH=swapped?pg.pageW:pg.pageH;
            // 90° 시계방향 변환: 박스 좌상단을 점으로 취급
            // (x, y) → (oldH - y - h, x), 새 박스의 좌상단이 회전 후 어디 가는지 계산
            if(pg.textBoxes&&pg.textBoxes.length){
                pg.textBoxes.forEach(b=>{
                    const approxH=b.size*1.2;
                    const nx=oldH-b.y-approxH;
                    const ny=b.x;
                    b.x=Math.max(0,nx);
                    b.y=Math.max(0,ny);
                });
            }
            if(pg.imageBoxes&&pg.imageBoxes.length){
                pg.imageBoxes.forEach(b=>{
                    const nx=oldH-b.y-b.h;
                    const ny=b.x;
                    b.x=Math.max(0,nx);
                    b.y=Math.max(0,ny);
                    // 회전 후 폭/높이 swap
                    const tmp=b.w;b.w=b.h;b.h=tmp;
                    if(b.naturalW&&b.naturalH){const t=b.naturalW;b.naturalW=b.naturalH;b.naturalH=t}
                });
            }
            pg.rotation=(pg.rotation+90)%360;
            const newC=renderThumbCanvas(pg);
            div.replaceChild(newC,div.querySelector('canvas'));
            scheduleThumbRedraw();
        });
        div.querySelector('[data-act="preview"]').addEventListener('click',e=>{
            e.stopPropagation();
            openPageEditor(pg);
        });
        div.querySelector('[data-act="delete"]').addEventListener('click',e=>{
            e.stopPropagation();
            pushHistory();
            const idx=editPages.indexOf(pg);
            if(idx>=0)editPages.splice(idx,1);
            // 더 이상 그 sourceFile에 속한 페이지가 없으면 sourceNames/Files에서 제거
            const stillHas=editPages.some(p=>p.sourceFile===pg.sourceFile);
            if(!stillHas){
                const sIdx=editSourceNames.indexOf(pg.sourceFile);
                if(sIdx>=0){editSourceNames.splice(sIdx,1);editSourceFiles.splice(sIdx,1)}
            }
            if(!editPages.length){document.getElementById('editClearBtn').click();return}
            renderEditGrid();
        });
        function togglePageSel(){pushHistory();pg.selected=!pg.selected;div.classList.toggle('selected',pg.selected);div.style.borderColor=pg.selected?color:'';div.setAttribute('aria-checked',pg.selected?'true':'false');updateEditStatus();scheduleThumbRedraw()}
        div.addEventListener('click',e=>{if(e.target.closest('.page-thumb-rotate')||e.target.closest('.page-thumb-btn'))return;togglePageSel()});
        div.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();togglePageSel()}});
        div.addEventListener('dragstart',e=>{editDragIdx=i;div.classList.add('dragging-thumb');e.dataTransfer.effectAllowed='move'});
        div.addEventListener('dragend',()=>{div.classList.remove('dragging-thumb');grid.querySelectorAll('.drag-over-thumb').forEach(el=>el.classList.remove('drag-over-thumb'));editDragIdx=null});
        div.addEventListener('dragover',e=>{e.preventDefault();if(editDragIdx!==null&&editDragIdx!==i)div.classList.add('drag-over-thumb')});
        div.addEventListener('dragleave',()=>div.classList.remove('drag-over-thumb'));
        div.addEventListener('drop',e=>{e.preventDefault();div.classList.remove('drag-over-thumb');if(editDragIdx===null||editDragIdx===i)return;pushHistory();const[moved]=editPages.splice(editDragIdx,1);editPages.splice(i,0,moved);editDragIdx=null;renderEditGrid()});
        grid.appendChild(div);
    });
    const fi=document.getElementById('editInlineAddInput');
    function makeAddBtn(){
        const btn=document.createElement('div');btn.className='edit-add-thumb';
        btn.innerHTML=`<div style="font-size:13px;color:#666;font-weight:600">${T.addBtn}</div>`;
        btn.addEventListener('click',()=>fi.click());
        btn.addEventListener('dragover',e=>{e.preventDefault();btn.style.borderColor='#666'});
        btn.addEventListener('dragleave',()=>{btn.style.borderColor=''});
        btn.addEventListener('drop',e=>{e.preventDefault();btn.style.borderColor='';
            const files=Array.from(e.dataTransfer.files).filter(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'));
            if(files.length)handleEditFiles(files);
        });
        return btn;
    }
    grid.appendChild(makeAddBtn());
    fi.onchange=e=>{handleEditFiles(Array.from(e.target.files));fi.value=''};
    updateEditStatus();
    scheduleThumbRedraw();
}

function updateEditStatus(){
    const sel=editPages.filter(p=>p.selected).length;const total=editPages.length;
    const msg=sel===0?T.editStatusSelect:sel===total?T.editStatusAllSelected:T.editStatusSome(sel,total);
    document.getElementById('editStatus').textContent=msg;
    const btn=document.getElementById('editSaveBtn');
    btn.disabled=sel===0;
    if(!sel)btn.textContent=T.btnSave;
    else if(editSourceNames.length>=2)btn.textContent=T.btnMergeSave(sel);
    else if(sel<total)btn.textContent=T.btnExtractSave(sel);
    else btn.textContent=T.btnSavePages(sel);
}

document.getElementById('editSelectToggle').addEventListener('click',()=>{
    pushHistory();
    const allSelected=editPages.every(p=>p.selected);
    editPages.forEach(p=>p.selected=!allSelected);renderEditGrid();
    document.getElementById('editSelectToggle').textContent=!allSelected?T.deselectAll:T.selectAll;
});

// Toolbar: stamp 버튼 ↔ 패널 토글, 한 번에 한 패널만 노출
const STAMP_TABS=[
    {btn:'editTbPagenum',panel:'editPanelPagenum',enable:'editPagenumEnable'},
    {btn:'editTbMark',panel:'editPanelMark',enable:'editMarkEnable'},
];
function setActiveStampTab(target){
    STAMP_TABS.forEach(t=>{
        const isActive=t.btn===target;
        document.getElementById(t.btn).classList.toggle('active',isActive);
        document.getElementById(t.panel).style.display=isActive?'block':'none';
    });
}
STAMP_TABS.forEach(t=>{
    const btn=document.getElementById(t.btn);
    btn.addEventListener('click',()=>{
        const isActive=btn.classList.contains('active');
        if(isActive)setActiveStampTab(null);
        else setActiveStampTab(t.btn);
    });
    document.getElementById(t.enable).addEventListener('change',e=>{
        const cfg=document.getElementById(t.panel).querySelector('[id$="Config"]');
        cfg.style.display=e.target.checked?'block':'none';
        btn.classList.toggle('armed',e.target.checked);
    });
});
document.getElementById('editTbAddFile').addEventListener('click',()=>{
    document.getElementById('editInlineAddInput').click();
});

// 워터마크 텍스트/이미지 모드 전환
let editMarkMode='text',editMarkImgData=null;
function setEditMarkMode(m){
    editMarkMode=m;
    document.getElementById('editMarkTextView').style.display=m==='text'?'':'none';
    document.getElementById('editMarkImageView').style.display=m==='image'?'':'none';
    document.getElementById('editMarkModeText').className='btn btn-sm '+(m==='text'?'btn-primary':'btn-secondary');
    document.getElementById('editMarkModeImage').className='btn btn-sm '+(m==='image'?'btn-primary':'btn-secondary');
    scheduleThumbRedraw();
}
document.getElementById('editMarkModeText').addEventListener('click',()=>setEditMarkMode('text'));
document.getElementById('editMarkModeImage').addEventListener('click',()=>setEditMarkMode('image'));
setupDropZone('editMarkImgZone','editMarkImgInput',async files=>{
    const f=files[0];if(!f||!f.type.startsWith('image/'))return;
    editMarkImgData={arrayBuffer:await f.arrayBuffer(),type:f.type};
    _markImgEl=null;
    document.getElementById('editMarkImgZone').innerHTML=T.editMarkImgSelectedHtml(escapeHtml(f.name));
    scheduleThumbRedraw();
},{accept:'image/*'});

// 옵션 변경 → 썸네일 redraw
['editPanelPagenum','editPanelMark'].forEach(id=>{
    const panel=document.getElementById(id);if(!panel)return;
    panel.addEventListener('input',scheduleThumbRedraw);
    panel.addEventListener('change',scheduleThumbRedraw);
});

async function createWatermarkPng(text,w,h,fontSize,opacity,mode){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');ctx.font=`bold ${fontSize}px 'Pretendard Variable',Pretendard,-apple-system,sans-serif`;ctx.fillStyle=`rgba(128,128,128,${opacity})`;ctx.textAlign='center';ctx.textBaseline='middle';
    if(mode==='diagonal'){ctx.translate(w/2,h/2);ctx.rotate(-Math.PI/4);ctx.fillText(text,0,0)}
    else if(mode==='horizontal'){ctx.fillText(text,w/2,h/2)}
    else if(mode==='tiled'){ctx.rotate(-Math.PI/6);const tw=ctx.measureText(text).width;for(let y=-h;y<h*2;y+=fontSize*3){for(let x=-w;x<w*2;x+=tw+fontSize*2){ctx.fillText(text,x,y)}}}
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));return new Uint8Array(await blob.arrayBuffer());
}

document.getElementById('editSaveBtn').addEventListener('click',async()=>{
    const selected=editPages.filter(p=>p.selected);if(!selected.length)return;
    const btn=document.getElementById('editSaveBtn');btn.disabled=true;btn.textContent=T.btnProcessing;
    const pb=document.getElementById('editProgress'),pf=document.getElementById('editProgressFill'),sta=document.getElementById('editStatus');
    pb.classList.add('active');pf.style.width='0%';
    const pagenumOn=document.getElementById('editPagenumEnable').checked;
    const markOn=document.getElementById('editMarkEnable').checked;
    const pagenumStart=parseInt(document.getElementById('editPagenumStart').value)||1;
    const pagenumPos=document.getElementById('editPagenumPos').value;
    const pagenumFmt=document.getElementById('editPagenumFormat').value;
    const markText=document.getElementById('editMarkText').value.trim();
    const markFontSize=parseInt(document.getElementById('editMarkSize').value);
    const markLayout=document.getElementById('editMarkLayout').value;
    const markImgPos=document.getElementById('editMarkImgPos').value;
    const markImgSize=parseInt(document.getElementById('editMarkImgSize').value);
    const markTextOn=markOn&&editMarkMode==='text'&&markText;
    const markImgOn=markOn&&editMarkMode==='image'&&editMarkImgData;
    try{
        const doc=await PDFLib.PDFDocument.create();const pdfCache=new Map();
        let font=null;
        const markPngCache={};let markImgEmbedded=null;
        for(let i=0;i<selected.length;i++){
            const pg=selected[i];
            let src=pdfCache.get(pg.arrayBuffer);
            if(!src){src=await loadPdf(pg.arrayBuffer.slice(0));pdfCache.set(pg.arrayBuffer,src)}
            const[copied]=await doc.copyPages(src,[pg.sourcePageIndex]);
            if(pg.rotation){const cur=copied.getRotation().angle;copied.setRotation(PDFLib.degrees((cur+pg.rotation)%360))}
            const{width,height}=copied.getSize();
            // 워터마크 (밑 레이어 — 반투명/도장)
            if(markTextOn){
                const key=`${Math.round(width)}x${Math.round(height)}`;
                if(!markPngCache[key]){const png=await createWatermarkPng(markText,Math.round(width),Math.round(height),markFontSize,0.2,markLayout);markPngCache[key]=await doc.embedPng(png)}
                copied.drawImage(markPngCache[key],{x:0,y:0,width,height});
            }
            if(markImgOn){
                if(!markImgEmbedded){
                    if(editMarkImgData.type==='image/png')markImgEmbedded=await doc.embedPng(editMarkImgData.arrayBuffer);
                    else markImgEmbedded=await doc.embedJpg(editMarkImgData.arrayBuffer);
                }
                const ratio=markImgEmbedded.height/markImgEmbedded.width;const w=markImgSize,h=markImgSize*ratio;
                const margin=30;let x,y;
                if(markImgPos==='br'){x=width-w-margin;y=margin}
                else if(markImgPos==='bl'){x=margin;y=margin}
                else if(markImgPos==='tr'){x=width-w-margin;y=height-h-margin}
                else if(markImgPos==='tl'){x=margin;y=height-h-margin}
                else{x=(width-w)/2;y=(height-h)/2}
                copied.drawImage(markImgEmbedded,{x,y,width:w,height:h});
            }
            const needsFont=pagenumOn||(pg.textBoxes&&pg.textBoxes.length);
            if(needsFont&&!font){
                font=await embedPretendard(doc);
                if(_koreanFontCache==='FAIL'){
                    // 한글이 포함된 텍스트가 있을 때만 사용자에게 알림
                    const hasKorean=(pg.textBoxes||[]).some(b=>/[ㄱ-힝]/.test(b.text||''));
                    if(hasKorean){
                        const errEl=document.getElementById('editError');
                        if(errEl)showError(errEl,T.fontFallbackWarn);
                    }
                }
            }
            // 페이지번호 (위 레이어)
            if(pagenumOn){
                const num=pagenumStart+i;
                const total=selected.length+pagenumStart-1;
                let label;if(pagenumFmt==='n')label=String(num);else if(pagenumFmt==='dash')label=`- ${num} -`;else label=`${num}/${total}`;
                const sz=10;const tw=font.widthOfTextAtSize(label,sz);
                let x,y;
                if(pagenumPos==='bc'){x=(width-tw)/2;y=30}
                else if(pagenumPos==='br'){x=width-tw-40;y=30}
                else if(pagenumPos==='bl'){x=40;y=30}
                else{x=(width-tw)/2;y=height-30}
                copied.drawText(label,{x,y,size:sz,font,color:PDFLib.rgb(.3,.3,.3)});
            }
            // 이미지 박스들 (페이지에 직접 추가)
            if(pg.imageBoxes&&pg.imageBoxes.length){
                for(const ib of pg.imageBoxes){
                    try{
                        // dataUrl → bytes
                        const m=ib.dataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
                        if(!m)continue;
                        const mime=m[1];const bin=atob(m[2]);
                        const arr=new Uint8Array(bin.length);
                        for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k)&0xff;
                        const embedded=mime==='image/png'?await doc.embedPng(arr):await doc.embedJpg(arr);
                        copied.drawImage(embedded,{
                            x:ib.x,
                            y:height-ib.y-ib.h,
                            width:ib.w,
                            height:ib.h
                        });
                    }catch(_){}
                }
            }
            // 텍스트 박스들 (페이지에 직접 추가)
            if(pg.textBoxes&&pg.textBoxes.length){
                pg.textBoxes.forEach(b=>{
                    if(!b.text||!b.text.trim())return;
                    const lines=b.text.split('\n');
                    const lineH=b.size*1.2;
                    const widths=lines.map(l=>font.widthOfTextAtSize(l,b.size));
                    const maxW=Math.max(0,...widths);
                    const totalH=lineH*lines.length;
                    const align=b.align||'left';
                    // 배경 사각형
                    if(b.bg){
                        const padX=4,padY=2;
                        const bgC=hexToPdfRgb(b.bg);
                        copied.drawRectangle({
                            x:b.x-padX,
                            y:height-(b.y+totalH)-padY,
                            width:maxW+padX*2,
                            height:totalH+padY*2,
                            color:PDFLib.rgb(bgC.r,bgC.g,bgC.b)
                        });
                    }
                    const txtC=hexToPdfRgb(b.color||'#222');
                    lines.forEach((line,li)=>{
                        const lineW=widths[li];
                        let xPdf=b.x;
                        if(align==='center')xPdf+=(maxW-lineW)/2;
                        else if(align==='right')xPdf+=(maxW-lineW);
                        const yPdf=height-(b.y+b.size+li*lineH);
                        copied.drawText(line,{x:xPdf,y:yPdf,size:b.size,font,color:PDFLib.rgb(txtC.r,txtC.g,txtC.b)});
                        // 가짜 굵게 (한글 폰트는 단일 weight라 한 픽셀 옆에 한 번 더 그려서 효과)
                        if(b.bold){
                            copied.drawText(line,{x:xPdf+0.4,y:yPdf,size:b.size,font,color:PDFLib.rgb(txtC.r,txtC.g,txtC.b)});
                        }
                        // 밑줄
                        if(b.underline&&line.length){
                            const ulThickness=Math.max(0.5,b.size*0.06);
                            copied.drawLine({
                                start:{x:xPdf,y:yPdf-ulThickness*1.4},
                                end:{x:xPdf+lineW,y:yPdf-ulThickness*1.4},
                                thickness:ulThickness,
                                color:PDFLib.rgb(txtC.r,txtC.g,txtC.b)
                            });
                        }
                    });
                });
            }
            doc.addPage(copied);
            pf.style.width=((i+1)/selected.length*100)+'%';
            sta.textContent=T.editProgress(i+1,selected.length);
        }
        const outName=editSourceNames.length===1?editSourceNames[0]+'_edited.pdf':'merged.pdf';
        download(new Blob([await doc.save()],{type:'application/pdf'}),outName);
        showComplete(document.getElementById('editStatus'),T.saveComplete);
    }catch(e){document.getElementById('editStatus').textContent=T.errPrefix+e.message}
    finally{btn.disabled=false;btn.textContent=T.btnSave;setTimeout(()=>pb.classList.remove('active'),1000)}
});

document.getElementById('editClearBtn').addEventListener('click',()=>{
    editPages=[];editSourceNames=[];editSourceFiles=[];editCancelled.clear();_imgCache.clear();
    clearHistory();
    document.getElementById('editWorkspace').style.display='none';
    document.getElementById('editDropZone').style.display='';
    document.getElementById('editPageGrid').innerHTML='';
    document.getElementById('editFileList').innerHTML='';
    document.getElementById('editStatus').textContent='';
    document.getElementById('editError').classList.remove('show');
});

// ===== 2. 텍스트 추출 =====
let textFileName='';
setupDropZone('textDropZone','textFileInput',async files=>{
    const f=files[0];if(!f)return;checkLargeFiles(files,document.getElementById('view-text'));textFileName=f.name.replace(/\.pdf$/i,'');
    document.getElementById('textDropZone').style.display='none';
    const pb=document.getElementById('textProgress'),pf=document.getElementById('textProgressFill');pb.classList.add('active');pf.style.width='0%';
    document.getElementById('textStatus').textContent=T.textExtracting;
    try{const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;let txt='';
        for(let i=1;i<=pdf.numPages;i++){const pg=await pdf.getPage(i);const c=await pg.getTextContent();const t=c.items.map(x=>x.str).join(' ');if(t.trim())txt+=`${T.textPageHeader(i)}\n${t.trim()}\n\n`;pf.style.width=(i/pdf.numPages*100)+'%'}
        if(!txt.trim()){document.getElementById('textStatus').textContent=T.textNotFound;document.getElementById('textDropZone').style.display=''}
        else{document.getElementById('extractedText').value=txt.trim();document.getElementById('textResult').classList.add('active');showComplete(document.getElementById('textStatus'),T.textExtracted(pdf.numPages))}
    }catch(e){document.getElementById('textStatus').textContent=T.errPrefix+e.message;document.getElementById('textDropZone').style.display=''}
    finally{setTimeout(()=>pb.classList.remove('active'),500)}
});
document.getElementById('copyBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(document.getElementById('extractedText').value)}catch{document.getElementById('extractedText').select();document.execCommand('copy')}document.getElementById('copyBtn').textContent=T.copyDone;setTimeout(()=>document.getElementById('copyBtn').textContent=T.copy,1500)});
document.getElementById('downloadTxtBtn').addEventListener('click',()=>{download(new Blob([document.getElementById('extractedText').value],{type:'text/plain;charset=utf-8'}),textFileName+'.txt')});


// ===== 3. 이미지 변환 (이미지→PDF + PDF→이미지 통합) =====
function setConvertMode(mode){
    document.getElementById('convertImg2pdfView').style.display=mode==='img2pdf'?'':'none';
    document.getElementById('convertPdf2imgView').style.display=mode==='pdf2img'?'':'none';
    document.getElementById('convertModeImg2pdf').className='btn btn-sm '+(mode==='img2pdf'?'btn-primary':'btn-secondary');
    document.getElementById('convertModePdf2img').className='btn btn-sm '+(mode==='pdf2img'?'btn-primary':'btn-secondary');
}
document.getElementById('convertModeImg2pdf').addEventListener('click',()=>setConvertMode('img2pdf'));
document.getElementById('convertModePdf2img').addEventListener('click',()=>setConvertMode('pdf2img'));
function resetConvert(){resetTool('convert');setConvertMode('img2pdf')}

// ===== 4a. 이미지→PDF =====
let imgFiles=[];
setupDropZone('img2pdfDropZone','img2pdfFileInput',files=>{
    files.filter(f=>f.type.startsWith('image/')).forEach(f=>{
        const reader=new FileReader();reader.onload=()=>{imgFiles.push({name:f.name,data:reader.result,file:f});renderImgPreview()};reader.readAsDataURL(f);
    });
},{accept:'image/*'});
function renderImgPreview(){
    const c=document.getElementById('img2pdfPreview');c.innerHTML='';
    imgFiles.forEach((f,i)=>{
        const div=document.createElement('div');div.className='img-preview-item';
        div.innerHTML=`<img src="${f.data}"><button class="img-preview-remove">&times;</button><div class="img-preview-reorder"><button data-dir="-1">◀</button><button data-dir="1">▶</button></div>`;
        div.querySelector('.img-preview-remove').addEventListener('click',()=>{imgFiles.splice(i,1);renderImgPreview()});
        div.querySelectorAll('.img-preview-reorder button').forEach(btn=>btn.addEventListener('click',()=>{
            const d=parseInt(btn.dataset.dir);const ni=i+d;if(ni<0||ni>=imgFiles.length)return;[imgFiles[i],imgFiles[ni]]=[imgFiles[ni],imgFiles[i]];renderImgPreview();
        }));
        c.appendChild(div);
    });
    document.getElementById('img2pdfActions').style.display=imgFiles.length?'flex':'none';
    document.getElementById('img2pdfSizeGroup').style.display=imgFiles.length?'block':'none';
    document.getElementById('img2pdfStatus').textContent=imgFiles.length?T.imgCount(imgFiles.length):'';
}
document.getElementById('img2pdfBtn').addEventListener('click',async()=>{
    if(!imgFiles.length)return;const pageSize=document.getElementById('img2pdfPageSize').value;
    const A4W=595.28,A4H=841.89;
    const doc=await PDFLib.PDFDocument.create();
    for(const img of imgFiles){
        const ab=await img.file.arrayBuffer();
        let embedded;if(img.file.type==='image/png')embedded=await doc.embedPng(ab);else embedded=await doc.embedJpg(ab);
        if(pageSize==='a4fit'){
            const page=doc.addPage([A4W,A4H]);const scale=Math.min(A4W/embedded.width,A4H/embedded.height);
            const w=embedded.width*scale,h=embedded.height*scale;page.drawImage(embedded,{x:(A4W-w)/2,y:(A4H-h)/2,width:w,height:h});
        }else{const page=doc.addPage([embedded.width,embedded.height]);page.drawImage(embedded,{x:0,y:0,width:embedded.width,height:embedded.height})}
    }
    download(new Blob([await doc.save()],{type:'application/pdf'}),'images.pdf');
    showComplete(document.getElementById('img2pdfStatus'),T.done);
});

// ===== 4b. PDF→이미지 =====
let pdf2imgData=null,pdf2imgGetSel=null;
setupDropZone('pdf2imgDropZone','pdf2imgFileInput',async files=>{
    const f=files[0];if(!f)return;checkLargeFiles(files,document.getElementById('view-pdf2img'));
    pdf2imgData={arrayBuffer:await f.arrayBuffer(),name:f.name.replace(/\.pdf$/i,'')};
    document.getElementById('pdf2imgDropZone').style.display='none';document.getElementById('pdf2imgOptions').style.display='block';
    pdf2imgGetSel=await renderPageGrid(pdf2imgData.arrayBuffer,'pdf2imgPageContainer',{onCount:(c,t)=>{document.getElementById('pdf2imgStatus').textContent=c?T.pagesSelected(c):T.totalPagesAll(t)}});
});
document.getElementById('pdf2imgBtn').addEventListener('click',async()=>{
    if(!pdf2imgData)return;const fmt=document.getElementById('pdf2imgFormat').value;const scale=parseInt(document.getElementById('pdf2imgScale').value);
    let sel=pdf2imgGetSel();const pdf=await pdfjsLib.getDocument({data:pdf2imgData.arrayBuffer}).promise;
    if(!sel.length)sel=Array.from({length:pdf.numPages},(_,i)=>i);
    const pb=document.getElementById('pdf2imgProgress'),pf=document.getElementById('pdf2imgProgressFill');pb.classList.add('active');pf.style.width='0%';
    for(let idx=0;idx<sel.length;idx++){
        const page=await pdf.getPage(sel[idx]+1);const vp=page.getViewport({scale});
        const canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height;
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
        const blob=await new Promise(r=>canvas.toBlob(r,`image/${fmt}`,0.95));
        download(blob,`${pdf2imgData.name}_${sel[idx]+1}.${fmt==='jpeg'?'jpg':'png'}`);
        pf.style.width=((idx+1)/sel.length*100)+'%';
    }
    showComplete(document.getElementById('pdf2imgStatus'),T.imagesDownloaded(sel.length));
    setTimeout(()=>pb.classList.remove('active'),1000);
});

// ===== Reset Tool =====
function resetTool(id){
    const view=document.getElementById('view-'+id);
    view.querySelectorAll('.drop-zone').forEach(d=>d.style.display='');
    view.querySelectorAll('[id$="Options"]').forEach(d=>d.style.display='none');
    view.querySelectorAll('.status').forEach(s=>s.textContent='');
    view.querySelectorAll('.error-msg').forEach(e=>{e.classList.remove('show');e.textContent=''});
    view.querySelectorAll('.warn-msg').forEach(w=>w.remove());
    view.querySelectorAll('.progress-bar').forEach(p=>p.classList.remove('active'));
    view.querySelectorAll('.text-result').forEach(t=>t.classList.remove('active'));
    view.querySelectorAll('[id$="PageContainer"]').forEach(c=>c.innerHTML='');
    if(id==='convert'){imgFiles=[];document.getElementById('img2pdfPreview').innerHTML='';document.getElementById('img2pdfActions').style.display='none';document.getElementById('img2pdfSizeGroup').style.display='none'}
    if(id==='edit'){
        editPages=[];editSourceNames=[];editSourceFiles=[];_imgCache.clear();
        document.getElementById('editWorkspace').style.display='none';
        document.getElementById('editPageGrid').innerHTML='';
        document.getElementById('editFileList').innerHTML='';
        editMarkImgData=null;
        const mz=document.getElementById('editMarkImgZone');if(mz)mz.innerHTML=T.editMarkImgZoneInitHtml;
    }
    if(id==='text'){document.getElementById('textDropZone').style.display=''}
}
