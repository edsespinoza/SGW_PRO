"""
build_v11.py — Gera sgw_pro_final_v11.html com novo CertPDF
usando imagens reais extraídas do PDF da Aberama Brasil.
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE   = r'C:\Users\Espinoza\Documents\Documentação AutoTech\Cadastro de Clientes\Aberama\Ferramenta Certificado'
B64DIR = os.path.join(BASE, 'pdf_extracted_imgs', 'b64parts')
SRC    = os.path.join(BASE, 'sgw_pro_final_v10.html')
DST    = os.path.join(BASE, 'sgw_pro_final_v11.html')

def read_b64(name):
    path = os.path.join(B64DIR, name + '.txt')
    with open(path, 'r', encoding='utf-8') as f:
        return f.read().strip()

print('Lendo imagens...')
imgs = {k: read_b64(k) for k in ['LOGO_SHIELD','SEAL_LOGO','ABERAMA_LOGO',
                                   'FOOTER_BANNER','CERT_BANNER','STELLANTIS',
                                   'BG_CARD_A','BG_CARD_B']}
print('OK — carregadas', sum(len(v) for v in imgs.values()), 'chars de b64')

# ──────────────────────────────────────────────────────────────────────────────
# Novo bloco: PIMG constants + novo CertPDF component
# (substitui da linha `const CertPDF=` até o fechamento `};` antes de CertLink)
# ──────────────────────────────────────────────────────────────────────────────
NEW_BLOCK = r"""/* ═══════════════════════════════════════════════════════
   PIMG — Imagens reais extraídas do certificado Aberama Brasil
═══════════════════════════════════════════════════════ */
const PIMG={
  shield:  'data:image/jpeg;base64,__SHIELD__',
  seal:    'data:image/jpeg;base64,__SEAL__',
  logo:    'data:image/jpeg;base64,__LOGO__',
  footer:  'data:image/jpeg;base64,__FOOTER__',
  certBan: 'data:image/jpeg;base64,__CERTBAN__',
  stella:  'data:image/jpeg;base64,__STELLA__',
  bgA:     'data:image/jpeg;base64,__BGA__',
  bgB:     'data:image/jpeg;base64,__BGB__',
};

const CertPDF=({open,close,lic,screens})=>{
  const [tab,setTab]=useState(1);
  const [gen,setGen]=useState(false);
  const CY='#00D4FF';
  const A4={width:'210mm',height:'297mm',position:'relative',fontFamily:'system-ui,sans-serif',overflow:'hidden',background:'#060b14'};

  const exportPDF=async()=>{
    setGen(true);
    try{
      const pages=document.querySelectorAll('.pdf-pg');
      if(!pages.length){alert('Nenhuma página visível');setGen(false);return;}
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
      for(let i=0;i<Math.min(pages.length,3);i++){
        if(i>0)pdf.addPage();
        const c=await html2canvas(pages[i],{scale:2,useCORS:true,logging:false,backgroundColor:'#060b14'});
        pdf.addImage(c.toDataURL('image/jpeg',.93),'JPEG',0,0,210,297);
      }
      pdf.save(`SGW_${(lic.customerName||'cert').replace(/\s+/g,'_')}_${lic.licenseKey?.slice(-8)||'doc'}.pdf`);
    }catch(e){alert('Erro ao gerar PDF: '+e.message);}
    setGen(false);
  };

  if(!open)return null;

  /* helpers de campo do certificado */
  const fv=(v,mask)=>(!v||v==='---')?'—':(mask?mask(v):v);
  const exp=lic.validUntil?new Date(lic.validUntil+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  const atv=lic.activationDate?new Date(lic.activationDate+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  const reg=lic.region?(RNAMES[lic.region]||lic.region):'—';
  const today=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});

  return(
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col" style={{animation:'fadeUp .3s ease-out'}}>

      {/* ── Barra superior ── */}
      <div className="bg-sgw-900 border-b border-sgw-700 px-5 py-3.5 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cy-500/30 to-blue-600/30 border border-cy-500/30 flex items-center justify-center">📄</div>
          <div><h2 className="font-heading text-lg font-black text-white">Certificado SGW · {lic.licenseKey}</h2><p className="text-xs text-slate-500">Documento oficial Aberama Brasil</p></div>
        </div>
        <div className="flex gap-2">
          <Btn ch="🖨️ Imprimir" variant="secondary" size="sm" onClick={()=>window.print()}/>
          <Btn ch="📄 Baixar PDF" variant="gold" size="sm" loading={gen} onClick={exportPDF}/>
          <button onClick={close} className="p-2 hover:bg-sgw-800 rounded-xl text-slate-400 hover:text-white text-xl">×</button>
        </div>
      </div>

      {/* ── Abas ── */}
      <div className="bg-sgw-850/50 border-b border-sgw-700 px-5 py-2 flex gap-2 shrink-0 no-print">
        {[{id:1,lbl:'🛡️ Licença'},{id:2,lbl:'📸 Evidências'},{id:3,lbl:'📋 Termo'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab===t.id?'bg-cy-500/20 text-cy-400 border border-cy-500/40':'text-slate-400 hover:text-white hover:bg-sgw-800'}`}>{t.lbl}</button>
        ))}
      </div>

      {/* ── Área de páginas ── */}
      <div className="flex-1 overflow-auto bg-gray-950 p-8 no-print">
        <div className="mx-auto" style={{width:'210mm'}}>

          {/* ╔══════════════════════════════════════════════════╗
              ║  PÁGINA 1 — LICENÇA                             ║
              ╚══════════════════════════════════════════════════╝ */}
          <div className={`pdf-pg shadow-2xl mb-8 ${tab!==1?'hidden':''}`} style={A4}>

            {/* Background card com imagem real */}
            <img src={PIMG.bgA} alt="" style={{position:'absolute',top:0,left:0,width:'100%',height:'55%',objectFit:'cover',objectPosition:'center top',opacity:.55}}/>
            <div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',background:'linear-gradient(180deg,rgba(6,11,20,.35) 0%,rgba(6,11,20,.82) 45%,rgba(6,11,20,1) 75%)'}}/>

            {/* Conteúdo relativo */}
            <div style={{position:'relative',zIndex:1,height:'100%',display:'flex',flexDirection:'column',padding:'0'}}>

              {/* Cabeçalho com logo real */}
              <div style={{padding:'18px 28px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <img src={PIMG.logo} alt="Aberama Brasil" style={{height:'36px',objectFit:'contain'}}/>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'7px',color:'rgba(0,212,255,.7)',letterSpacing:'2px',textTransform:'uppercase'}}>Emitido em</div>
                  <div style={{fontSize:'9px',color:CY,fontFamily:'monospace',fontWeight:700}}>{today}</div>
                  <div style={{fontSize:'6px',color:'rgba(255,255,255,.2)',fontFamily:'monospace',marginTop:'1px'}}>SGW Pro v{APP.VER}</div>
                </div>
              </div>

              {/* Escudo central real */}
              <div style={{display:'flex',justifyContent:'center',marginTop:'16px'}}>
                <img src={PIMG.shield} alt="Aberama Shield" style={{height:'90px',objectFit:'contain',filter:'drop-shadow(0 0 18px rgba(0,212,255,.5))'}}/>
              </div>

              {/* Slogan */}
              <div style={{textAlign:'center',margin:'10px 0 14px'}}>
                <div style={{fontSize:'22px',fontWeight:900,color:'#FFF',textTransform:'uppercase',lineHeight:1.15,textShadow:'0 0 30px rgba(0,212,255,.4)',letterSpacing:'1px'}}>SUA LICENÇA<br/>ESTÁ ATIVA!</div>
                <div style={{width:'60px',height:'2px',background:`linear-gradient(90deg,transparent,${CY},transparent)`,margin:'8px auto 0'}}/>
              </div>

              {/* Card de dados */}
              <div style={{margin:'0 22px',background:'rgba(0,212,255,.04)',border:'1px solid rgba(0,212,255,.22)',borderRadius:'10px',padding:'14px 16px'}}>
                <div style={{fontSize:'7px',color:CY,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',marginBottom:'9px',textAlign:'center'}}>DADOS DA LICENÇA</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px'}}>
                  {[
                    ['NOME',           fv(lic.customerName)],
                    ['SCANNER',        fv(lic.equipment)],
                    ['SERIAL NUMBER',  fv(lic.equipmentSerial)],
                    ['REGIÃO',         reg],
                    ['LOGIN SGW',      fv(lic.sgwLogin)],
                    ['SENHA SGW',      fv(lic.sgwPassword)],
                    ['ATIVAÇÃO',       atv],
                    ['EXPIRA EM',      exp],
                  ].map(([k,v])=>(
                    <div key={k} style={{borderBottom:'1px solid rgba(255,255,255,.05)',paddingBottom:'4px'}}>
                      <div style={{fontSize:'6px',color:'rgba(0,212,255,.55)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{k}</div>
                      <div style={{fontSize:'8px',color:k==='EXPIRA EM'?'#ff6b6b':'#EEE',fontWeight:700,marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Chave de controle */}
                <div style={{marginTop:'9px',paddingTop:'7px',borderTop:'1px solid rgba(0,212,255,.1)',textAlign:'center'}}>
                  <span style={{fontSize:'6px',color:'rgba(255,255,255,.3)',letterSpacing:'1px'}}>Nº CONTROLE · </span>
                  <span style={{fontSize:'7px',color:CY,fontFamily:'monospace',letterSpacing:'1.5px'}}>{lic.licenseKey||'---'}</span>
                </div>
              </div>

              {/* Marcas Stellantis */}
              <div style={{margin:'10px 22px 0'}}>
                <div style={{fontSize:'6px',color:'rgba(255,255,255,.25)',textAlign:'center',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'5px'}}>Compatível com veículos Stellantis</div>
                <img src={PIMG.stella} alt="Marcas Stellantis" style={{width:'100%',borderRadius:'6px',objectFit:'cover',maxHeight:'46px'}}/>
              </div>

              {/* Footer banner real */}
              <div style={{marginTop:'auto'}}>
                <img src={PIMG.footer} alt="" style={{width:'100%',display:'block',borderRadius:'0 0 0 0'}}/>
              </div>
            </div>
          </div>

          {/* ╔══════════════════════════════════════════════════╗
              ║  PÁGINA 2 — CERTIFICADO + EVIDÊNCIAS            ║
              ╚══════════════════════════════════════════════════╝ */}
          <div className={`pdf-pg shadow-2xl mb-8 ${tab!==2?'hidden':''}`} style={A4}>
            <div style={{position:'relative',zIndex:1,height:'100%',display:'flex',flexDirection:'column'}}>

              {/* Banner do certificado real */}
              <img src={PIMG.certBan} alt="Certificado Aberama" style={{width:'100%',display:'block',flexShrink:0,maxHeight:'72px',objectFit:'cover'}}/>

              {/* Selo + Título */}
              <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 24px 8px'}}>
                <img src={PIMG.seal} alt="Selo" style={{height:'60px',objectFit:'contain',filter:'drop-shadow(0 0 10px rgba(0,212,255,.4))',flexShrink:0}}/>
                <div>
                  <div style={{fontSize:'8px',color:CY,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',marginBottom:'3px'}}>Aberama Brasil</div>
                  <div style={{fontSize:'20px',fontWeight:900,color:'#FFF',textTransform:'uppercase',lineHeight:1.1}}>CERTIFICAMOS QUE<br/><span style={{color:CY}}>O SGW FOI ATIVADO</span><br/>COM SUCESSO</div>
                  <div style={{height:'2px',background:`linear-gradient(90deg,${CY},transparent)`,marginTop:'5px',width:'70%'}}/>
                </div>
              </div>

              {/* Info importante */}
              <div style={{margin:'0 22px 8px',padding:'9px 12px',background:'rgba(0,212,255,.05)',border:'1px solid rgba(0,212,255,.2)',borderRadius:'8px'}}>
                <div style={{fontSize:'7px',color:CY,fontWeight:700,letterSpacing:'2px',textTransform:'uppercase',marginBottom:'5px'}}>Informações Importantes</div>
                {['Guarde este certificado — ele comprova a ativação da sua licença SGW.',
                  'O acesso é de uso exclusivo e intransferível ao equipamento cadastrado.',
                  'Mantenha o scanner sempre atualizado para compatibilidade contínua.',
                  'Qualquer dúvida acione nosso suporte: suporte@aberamabrasil.com.br'
                ].map((t,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'5px',marginBottom:'3px'}}>
                    <span style={{color:CY,fontSize:'8px',flexShrink:0,marginTop:'1px'}}>•</span>
                    <span style={{fontSize:'7.5px',color:'#AAA',lineHeight:1.4}}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Grade de evidências */}
              <div style={{padding:'0 22px'}}>
                <div style={{fontSize:'7px',color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'5px'}}>Capturas de tela ({Object.keys(screens).length}/8)</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px'}}>
                  {SCREENS_CFG.map(sc=>(
                    <div key={sc.id} style={{aspectRatio:'4/3',borderRadius:'6px',overflow:'hidden',border:`1.5px solid ${screens[sc.id]?CY:'#1a1a2e'}`,position:'relative',background:'#0a0a14'}}>
                      {screens[sc.id]
                        ?<img src={screens[sc.id]} alt={sc.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        :<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'2px'}}>
                          <span style={{fontSize:'13px'}}>{sc.icon}</span>
                          <span style={{fontSize:'5.5px',color:'#333',textAlign:'center'}}>{sc.name}</span>
                        </div>}
                      {screens[sc.id]&&<span style={{position:'absolute',top:'2px',right:'3px',fontSize:'7px',color:'#00C853',fontWeight:900}}>✓</span>}
                      <span style={{position:'absolute',bottom:'2px',left:'3px',fontSize:'5px',color:'#333'}}>{sc.id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rodapé */}
              <div style={{marginTop:'auto',padding:'7px 22px 0',borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <img src={PIMG.logo} alt="Aberama" style={{height:'18px',objectFit:'contain',opacity:.6}}/>
                <span style={{fontSize:'7px',color:'#333',fontFamily:'monospace'}}>Pág. 2/3 · Evidências Fotográficas</span>
              </div>
              <div style={{height:'10px'}}/>
            </div>
          </div>

          {/* ╔══════════════════════════════════════════════════╗
              ║  PÁGINA 3 — TERMO DE COMPROMISSO               ║
              ╚══════════════════════════════════════════════════╝ */}
          <div className={`pdf-pg shadow-2xl mb-8 ${tab!==3?'hidden':''}`} style={A4}>
            <div style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',opacity:.03}} className="cert-dots"/>
            <div style={{position:'relative',zIndex:1,height:'100%',display:'flex',flexDirection:'column',padding:'22px 28px 0'}}>

              {/* Cabeçalho */}
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                <img src={PIMG.logo} alt="Aberama" style={{height:'28px',objectFit:'contain'}}/>
                <div>
                  <div style={{fontSize:'7px',color:CY,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase'}}>Aberama Brasil</div>
                  <div style={{fontSize:'22px',fontWeight:900,color:'#FFF',textTransform:'uppercase',lineHeight:1}}>TERMO DE COMPROMISSO</div>
                  <div style={{height:'2px',background:`linear-gradient(90deg,${CY},transparent)`,marginTop:'4px',width:'60%'}}/>
                </div>
              </div>

              {/* Introdução */}
              <div style={{fontSize:'8px',color:'#888',lineHeight:1.6,marginBottom:'10px',padding:'8px 11px',background:'rgba(0,212,255,.04)',borderLeft:`2px solid ${CY}`,borderRadius:'0 5px 5px 0'}}>
                Seja bem-vindo(a) à consultoria especializada para desbloqueio SGW (Security Gateway). Este documento garante total transparência entre a <strong style={{color:CY}}>Aberama Brasil</strong> e você, contratante do serviço.
              </div>

              {/* Cláusulas */}
              {[
                {n:'1',t:'O que você está contratando',
                 txt:'Consultoria técnica especializada para ativação da função SGW (Security Gateway) em seu scanner, incluindo acesso a uma licença com validade de 12 meses para desbloqueio de diagnóstico eletrônico em veículos da plataforma Stellantis.'},
                {n:'2',t:'Vínculo da licença com o equipamento',
                 txt:'A licença fornecida é vinculada exclusivamente ao número de série do scanner informado no momento da contratação. Após a ativação não poderá ser transferida para outro equipamento ou titular.'},
                {n:'3',t:'Como funciona a ativação',
                 txt:'A Aberama Brasil fornece os dados de acesso ao portal de homologação. A ativação é realizada por você no scanner no primeiro contato com um veículo Stellantis. Nossa equipe de suporte acompanha todo o processo via WhatsApp ou vídeo chamada.'},
                {n:'4',t:'Garantias e Política de Reembolso',
                 txt:'Não há reembolsos após a liberação dos dados de acesso. Será concedido reembolso integral caso o serviço não funcione no ato do desbloqueio, desde que confirmado por acompanhamento técnico da Aberama Brasil em tempo real.'},
                {n:'5',t:'Plataforma de homologação AutoAuth',
                 txt:'Scanners compatíveis com SGW precisam estar cadastrados em plataformas de homologação autorizadas pelos fabricantes (AutoAuth americana ou plataformas europeias equivalentes). A plataforma poderá ser alterada pelos fabricantes sem aviso prévio.'},
                {n:'6',t:'Suporte e vigência',
                 txt:'O suporte técnico está incluso durante toda a vigência da licença. Renovações podem ser solicitadas antes do vencimento com condições especiais para clientes ativos. O não uso da licença não gera direito a extensão de prazo.'},
              ].map(s=>(
                <div key={s.n} style={{marginBottom:'7px',display:'flex',gap:'7px'}}>
                  <div style={{flexShrink:0,width:'16px',height:'16px',borderRadius:'50%',background:'rgba(0,212,255,.1)',border:'1px solid rgba(0,212,255,.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'7px',color:CY,fontWeight:700}}>{s.n}</div>
                  <div><div style={{fontSize:'8px',fontWeight:700,color:'#EEE',marginBottom:'1px'}}>{s.t}</div><div style={{fontSize:'7px',color:'#666',lineHeight:1.45}}>{s.txt}</div></div>
                </div>
              ))}

              {/* Citação */}
              <div style={{padding:'7px 10px',background:'rgba(0,212,255,.04)',border:'1px solid rgba(0,212,255,.15)',borderRadius:'6px',marginTop:'4px'}}>
                <div style={{fontSize:'8px',fontWeight:600,color:'#CCC',fontStyle:'italic',textAlign:'center',lineHeight:1.5}}>"Nosso compromisso é oferecer suporte transparente e soluções técnicas justas, sempre dentro dos limites contratuais."</div>
              </div>

              {/* Assinaturas */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px',margin:'10px 0 8px'}}>
                {[{lbl:'Técnico Responsável',name:lic.technician||'---',sub:'Aberama Brasil'},{lbl:'Contratante',name:lic.customerName||'---',sub:`Doc: ${S.maskDoc(lic.cpfCnpj||'')}`}].map((sig,i)=>(
                  <div key={i} style={{textAlign:'center'}}><div style={{borderBottom:'1px solid rgba(255,255,255,.1)',height:'20px',marginBottom:'4px'}}/><div style={{fontSize:'9px',color:'#EEE',fontWeight:600}}>{sig.name}</div><div style={{fontSize:'6.5px',color:'#444',marginTop:'1px'}}>{sig.lbl}</div><div style={{fontSize:'6px',color:'#333',fontFamily:'monospace'}}>{sig.sub}</div></div>
                ))}
              </div>

              {/* Footer banner real */}
              <div style={{marginTop:'auto'}}>
                <img src={PIMG.footer} alt="" style={{width:'100%',display:'block'}}/>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};"""

# Substituir placeholders pelos base64 reais
NEW_BLOCK = NEW_BLOCK.replace('__SHIELD__',  imgs['LOGO_SHIELD'])
NEW_BLOCK = NEW_BLOCK.replace('__SEAL__',    imgs['SEAL_LOGO'])
NEW_BLOCK = NEW_BLOCK.replace('__LOGO__',    imgs['ABERAMA_LOGO'])
NEW_BLOCK = NEW_BLOCK.replace('__FOOTER__',  imgs['FOOTER_BANNER'])
NEW_BLOCK = NEW_BLOCK.replace('__CERTBAN__', imgs['CERT_BANNER'])
NEW_BLOCK = NEW_BLOCK.replace('__STELLA__',  imgs['STELLANTIS'])
NEW_BLOCK = NEW_BLOCK.replace('__BGA__',     imgs['BG_CARD_A'])
NEW_BLOCK = NEW_BLOCK.replace('__BGB__',     imgs['BG_CARD_B'])

print('Bloco novo:', len(NEW_BLOCK), 'chars')

# ──────────────────────────────────────────────────────────────────────────────
# Ler v10 e substituir trecho
# ──────────────────────────────────────────────────────────────────────────────
print('Lendo v10.html...')
with open(SRC, 'r', encoding='utf-8') as f:
    src = f.read()

# Marcadores de início e fim do bloco antigo
START_MARKER = '/* ═══════════════════════════════════════════════════════\n   CERT LINK / QR / VERIFY'
# O bloco anterior começa na linha `const CertPDF=`
OLD_START = 'const CertPDF=({'

# Encontrar posição de início do CertPDF
idx_start = src.find(OLD_START)
if idx_start == -1:
    print('ERRO: não encontrou const CertPDF')
    sys.exit(1)

# Encontrar o início do próximo bloco (CertLink)
idx_end = src.find(START_MARKER, idx_start)
if idx_end == -1:
    print('ERRO: não encontrou marcador de CertLink')
    sys.exit(1)

print(f'Substituindo chars [{idx_start}..{idx_end}]')

new_src = src[:idx_start] + NEW_BLOCK + '\n\n' + src[idx_end:]

# Atualizar versão para v11
new_src = new_src.replace("APP={VER:'10.0.0'", "APP={VER:'11.0.0'", 1)

print('Escrevendo v11.html...')
with open(DST, 'w', encoding='utf-8') as f:
    f.write(new_src)

size = os.path.getsize(DST)
print(f'Pronto! {DST}')
print(f'Tamanho: {size:,} bytes ({size/1024:.1f} KB)')
