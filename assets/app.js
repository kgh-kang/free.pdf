pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const APP_BASE=new URL('.',document.currentScript.src).href;
let _pretendardCache=null;
async function embedPretendard(pdfDoc){
    if(!_pretendardCache){
        const res=await fetch(new URL('fonts/Pretendard-Regular.otf',APP_BASE).href);
        _pretendardCache=new Uint8Array(await res.arrayBuffer());
    }
    pdfDoc.registerFontkit(fontkit);
    return await pdfDoc.embedFont(_pretendardCache,{subset:true});
}

const T=window.I18N;

// ===== Error/Warning display =====
function showError(errEl,msg){errEl.innerHTML=`${escapeHtml(msg)}<button class="error-msg-close" onclick="this.parentElement.classList.remove('show')">&times;</button>`;errEl.classList.add('show')}
function showWarn(parentEl,msg){const existing=parentEl.querySelector('.warn-msg');if(existing)existing.remove();const w=document.createElement('div');w.className='warn-msg';w.innerHTML=`${escapeHtml(msg)}<button class="warn-msg-close" onclick="this.parentElement.remove()">&times;</button>`;const target=parentEl.querySelector('.drop-zone');if(target)target.insertAdjacentElement('afterend',w);else parentEl.prepend(w)}

// ===== Helpers =====
async function loadPdf(ab){const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});if(pdf.isEncrypted)console.warn(T.consoleEncrypted);return pdf}
function formatSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function escapeHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
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
    dz.addEventListener('click',()=>fi.click());
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
setupDropZone('editDropZone','editFileInput',handleEditFiles);
setupDropZone('editAddDropZone','editAddFileInput',handleEditFiles);

async function handleEditFiles(files){
    const errEl=document.getElementById('editError');
    checkLargeFiles(files,document.getElementById('view-edit'));
    for(const f of files.filter(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'))){
        try{
            const rawBuf=await f.arrayBuffer();const ab=rawBuf.slice(0);
            const pdf=await pdfjsLib.getDocument({data:ab.slice(0)}).promise;
            const fname=f.name.replace(/\.pdf$/i,'');
            if(!editSourceNames.includes(fname)){editSourceNames.push(fname);editSourceFiles.push({name:f.name,size:f.size,pageCount:pdf.numPages})}
            for(let i=0;i<pdf.numPages;i++){
                if(editCancelled.has(fname))break;
                const page=await pdf.getPage(i+1);const vp=page.getViewport({scale:.5});
                const canvas=document.createElement('canvas');canvas.width=vp.width;canvas.height=vp.height;
                await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
                if(editCancelled.has(fname))break;
                editPages.push({arrayBuffer:ab,sourceFile:fname,sourcePageIndex:i,selected:true,thumbCanvas:canvas,rotation:0,textBoxes:[]});
            }
            editCancelled.delete(fname);
        }catch(e){showError(errEl,T.errFileRead(f.name))}
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
        div.innerHTML=`<span class="edit-file-dot" style="background:${color}"></span><div class="edit-file-info"><div class="edit-file-name" title="${fname}.pdf">${fname}.pdf</div><div class="edit-file-meta">${T.fileMeta(sizeStr,count)}</div></div><button class="edit-file-remove" title="${T.deleteTitle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>`;
        div.querySelector('.edit-file-info').addEventListener('click',()=>{
            editPages.forEach(p=>p.selected=p.sourceFile===fname);
            renderEditGrid();
        });
        div.querySelector('.edit-file-remove').addEventListener('click',e=>{
            e.stopPropagation();
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
const THUMB_SCALE=0.5;

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

function getTextModeOptions(){
    return{
        textModeOn:document.getElementById('editTextEnable')?.checked,
        textSize:parseInt(document.getElementById('editTextSize')?.value)||14,
        textColor:document.getElementById('editTextColor')?.value||'#222',
    };
}

function genBoxId(){return 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

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

function drawTextBoxesLayer(ctx,scale,boxes){
    if(!boxes||!boxes.length)return;
    boxes.forEach(b=>{
        ctx.save();
        const sz=b.size*scale;
        ctx.font=`${sz}px 'Pretendard Variable',Pretendard,sans-serif`;
        ctx.fillStyle=b.color||'#222';
        ctx.textBaseline='top';
        (b.text||'').split('\n').forEach((line,idx)=>{
            ctx.fillText(line,b.x*scale,(b.y+idx*b.size*1.2)*scale);
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
    applyStampOverlays(ctx,w,h,opts,THUMB_SCALE,pageIndex);
    drawTextBoxesLayer(ctx,THUMB_SCALE,pg.textBoxes);
    return c;
}

const MODAL_SCALE=1.5;
async function openPageEditor(pg){
    const opts=getStampOptionsLive();
    if(opts.markImgOn){opts.markImgEl=await getMarkImgElement().catch(()=>null)}
    const pdf=await pdfjsLib.getDocument({data:pg.arrayBuffer.slice(0)}).promise;
    const page=await pdf.getPage(pg.sourcePageIndex+1);
    const rot=pg.rotation%360;
    const vp=page.getViewport({scale:MODAL_SCALE,rotation:rot});
    const bigCanvas=document.createElement('canvas');bigCanvas.width=vp.width;bigCanvas.height=vp.height;
    const ctx=bigCanvas.getContext('2d');
    await page.render({canvasContext:ctx,viewport:vp}).promise;
    const selectedPages=editPages.filter(p=>p.selected);
    const pageIndex=pg.selected?selectedPages.indexOf(pg):null;
    applyStampOverlays(ctx,vp.width,vp.height,opts,MODAL_SCALE,pageIndex);

    const overlay=document.createElement('div');overlay.className='page-preview-overlay';
    const closeBtn=document.createElement('span');closeBtn.className='page-preview-close';closeBtn.innerHTML='&times;';
    overlay.appendChild(closeBtn);
    const wrap=document.createElement('div');wrap.className='page-editor-wrap';
    wrap.appendChild(bigCanvas);
    const textLayer=document.createElement('div');textLayer.className='page-editor-textlayer';
    wrap.appendChild(textLayer);
    overlay.appendChild(wrap);

    if(!pg.textBoxes)pg.textBoxes=[];
    function makeBoxEl(box){
        const el=document.createElement('div');
        el.className='page-text-box';
        el.dataset.id=box.id;
        el.style.left=(box.x*MODAL_SCALE)+'px';
        el.style.top=(box.y*MODAL_SCALE)+'px';
        el.style.fontSize=(box.size*MODAL_SCALE)+'px';
        el.style.color=box.color;
        const content=document.createElement('div');
        content.className='page-text-box-content';
        content.contentEditable='true';
        content.textContent=box.text||'';
        el.appendChild(content);
        const del=document.createElement('span');
        del.className='page-text-box-del';del.textContent='✕';
        del.addEventListener('mousedown',e=>{
            e.preventDefault();e.stopPropagation();
            const i=pg.textBoxes.indexOf(box);if(i>=0)pg.textBoxes.splice(i,1);
            el.remove();
        });
        el.appendChild(del);
        let drag=null;
        function onMove(e){
            if(!drag)return;
            const dx=(e.clientX-drag.mx)/MODAL_SCALE;
            const dy=(e.clientY-drag.my)/MODAL_SCALE;
            if(!drag.moved&&Math.hypot(dx,dy)<3)return;
            drag.moved=true;el.classList.add('dragging');
            box.x=Math.max(0,drag.bx+dx);box.y=Math.max(0,drag.by+dy);
            el.style.left=(box.x*MODAL_SCALE)+'px';
            el.style.top=(box.y*MODAL_SCALE)+'px';
        }
        function onUp(){
            const wasDrag=drag&&drag.moved;
            if(drag)el.classList.remove('dragging');
            drag=null;
            document.removeEventListener('mousemove',onMove);
            document.removeEventListener('mouseup',onUp);
            if(!wasDrag){
                content.focus();
                const range=document.createRange();range.selectNodeContents(content);range.collapse(false);
                const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
            }
        }
        el.addEventListener('mousedown',e=>{
            if(e.target===del||e.target===content||content.contains(e.target))return;
            if(document.activeElement===content)return;
            e.preventDefault();e.stopPropagation();
            drag={mx:e.clientX,my:e.clientY,bx:box.x,by:box.y,moved:false};
            document.addEventListener('mousemove',onMove);
            document.addEventListener('mouseup',onUp);
        });
        // 박스 본문이 비어 있을 땐 본문 클릭이 곧 포커스이지만, 본문이 채워졌어도 드래그 가능해야 자연스러우므로
        // content 영역에 별도 mousedown 처리: focus 안 됐으면 drag 우선
        content.addEventListener('mousedown',e=>{
            if(document.activeElement===content)return; // 이미 편집 중이면 정상 텍스트 선택
            e.preventDefault();e.stopPropagation();
            drag={mx:e.clientX,my:e.clientY,bx:box.x,by:box.y,moved:false};
            document.addEventListener('mousemove',onMove);
            document.addEventListener('mouseup',onUp);
        });
        content.addEventListener('blur',()=>{
            box.text=content.textContent;
            if(!box.text.trim()){
                const i=pg.textBoxes.indexOf(box);if(i>=0)pg.textBoxes.splice(i,1);
                el.remove();
            }
        });
        content.addEventListener('keydown',e=>{
            if(e.key==='Escape'){e.preventDefault();content.blur()}
            e.stopPropagation();
        });
        return el;
    }
    pg.textBoxes.forEach(b=>textLayer.appendChild(makeBoxEl(b)));

    bigCanvas.addEventListener('click',e=>{
        const tm=getTextModeOptions();
        if(!tm.textModeOn)return;
        const rect=bigCanvas.getBoundingClientRect();
        const cx=(e.clientX-rect.left)*(bigCanvas.width/rect.width)/MODAL_SCALE;
        const cy=(e.clientY-rect.top)*(bigCanvas.height/rect.height)/MODAL_SCALE;
        const box={id:genBoxId(),text:'',x:cx,y:cy,size:tm.textSize,color:tm.textColor};
        pg.textBoxes.push(box);
        const el=makeBoxEl(box);
        textLayer.appendChild(el);
        el.focus();
    });
    bigCanvas.style.cursor=getTextModeOptions().textModeOn?'text':'default';

    function close(){
        document.querySelectorAll('.page-text-box').forEach(el=>el.blur());
        overlay.remove();
        document.removeEventListener('keydown',onKey);
        scheduleThumbRedraw();
    }
    function onKey(e){if(e.key==='Escape'&&!e.target.closest('.page-text-box'))close()}
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
        div.innerHTML=`<div class="page-thumb-check" style="background:${color}">✓</div><div class="page-thumb-actions"><button class="page-thumb-btn" data-act="rotate" title="${T.rotateTitle}">↻</button><button class="page-thumb-btn" data-act="preview" title="${T.previewTitle}">⤢</button></div><div class="page-thumb-color" style="background:${color}"></div>`;
        const c=renderThumbCanvas(pg);
        div.insertBefore(c,div.firstChild);
        const num=document.createElement('div');num.className='page-thumb-num';num.textContent=(i+1)+'p';div.appendChild(num);
        div.querySelector('[data-act="rotate"]').addEventListener('click',e=>{
            e.stopPropagation();
            if(pg.textBoxes&&pg.textBoxes.length){
                if(!confirm(T.rotateClearsBoxes))return;
                pg.textBoxes=[];
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
        div.addEventListener('click',e=>{if(e.target.closest('.page-thumb-rotate'))return;pg.selected=!pg.selected;div.classList.toggle('selected',pg.selected);div.style.borderColor=pg.selected?color:'';updateEditStatus();scheduleThumbRedraw()});
        div.addEventListener('dragstart',e=>{editDragIdx=i;div.classList.add('dragging-thumb');e.dataTransfer.effectAllowed='move'});
        div.addEventListener('dragend',()=>{div.classList.remove('dragging-thumb');grid.querySelectorAll('.drag-over-thumb').forEach(el=>el.classList.remove('drag-over-thumb'));editDragIdx=null});
        div.addEventListener('dragover',e=>{e.preventDefault();if(editDragIdx!==null&&editDragIdx!==i)div.classList.add('drag-over-thumb')});
        div.addEventListener('dragleave',()=>div.classList.remove('drag-over-thumb'));
        div.addEventListener('drop',e=>{e.preventDefault();div.classList.remove('drag-over-thumb');if(editDragIdx===null||editDragIdx===i)return;const[moved]=editPages.splice(editDragIdx,1);editPages.splice(i,0,moved);editDragIdx=null;renderEditGrid()});
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
    grid.insertBefore(makeAddBtn(),grid.firstChild);
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
    btn.disabled=sel===0;btn.textContent=sel?T.btnSavePages(sel):T.btnSave;
}

document.getElementById('editSelectToggle').addEventListener('click',()=>{
    const allSelected=editPages.every(p=>p.selected);
    editPages.forEach(p=>p.selected=!allSelected);renderEditGrid();
    document.getElementById('editSelectToggle').textContent=!allSelected?T.deselectAll:T.selectAll;
});
document.getElementById('editToggleZoom').addEventListener('click',()=>{const g=document.getElementById('editPageGrid');g.classList.toggle('zoomed');document.getElementById('editToggleZoom').textContent=g.classList.contains('zoomed')?T.zoomOut:T.zoomIn});

// Toolbar: stamp 버튼 ↔ 패널 토글, 한 번에 한 패널만 노출
const STAMP_TABS=[
    {btn:'editTbPagenum',panel:'editPanelPagenum',enable:'editPagenumEnable'},
    {btn:'editTbText',panel:'editPanelText',enable:'editTextEnable'},
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
['editPanelPagenum','editPanelText','editPanelMark'].forEach(id=>{
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
            if(needsFont&&!font)font=await embedPretendard(doc);
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
            // 텍스트 박스들 (페이지에 직접 추가)
            if(pg.textBoxes&&pg.textBoxes.length){
                pg.textBoxes.forEach(b=>{
                    if(!b.text||!b.text.trim())return;
                    const lines=b.text.split('\n');
                    const c=PDFLib.rgb(parseInt(b.color.slice(1,3),16)/255,parseInt(b.color.slice(3,5),16)/255,parseInt(b.color.slice(5,7),16)/255);
                    lines.forEach((line,li)=>{
                        const yPdf=height-(b.y+b.size+li*b.size*1.2);
                        copied.drawText(line,{x:b.x,y:yPdf,size:b.size,font,color:c});
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
    editPages=[];editSourceNames=[];editSourceFiles=[];editCancelled.clear();
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
        editPages=[];editSourceNames=[];editSourceFiles=[];
        document.getElementById('editWorkspace').style.display='none';
        document.getElementById('editPageGrid').innerHTML='';
        document.getElementById('editFileList').innerHTML='';
        editMarkImgData=null;
        const mz=document.getElementById('editMarkImgZone');if(mz)mz.innerHTML=T.editMarkImgZoneInitHtml;
    }
    if(id==='text'){document.getElementById('textDropZone').style.display=''}
}
