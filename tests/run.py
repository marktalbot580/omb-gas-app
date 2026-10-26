"""OMB Gas Service - end-to-end test suite.

Run:  python3 -m http.server 8765 &   then   python3 tests/run.py
Needs: pip install playwright && playwright install chromium
Every check prints PASS/FAIL; the exit code is 1 if anything failed.
"""
import json, re, sys
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8765/'
results = []


def check(name, ok, info=''):
    results.append((name, bool(ok), info))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{info}]' if (info and not ok) else ''))


def fresh(browser, mobile=False):
    ctx = browser.new_context(viewport={'width': 390, 'height': 800}, accept_downloads=True, bypass_csp=True,
                              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' if mobile else None)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(URL)
    pg.evaluate("localStorage.clear(); OMBSTORE.wipe()")
    pg.wait_for_timeout(200)
    pg.reload()
    pg.wait_for_function("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
    pg.evaluate("document.querySelector('#gate') && document.querySelector('#gate').remove()")
    pg.evaluate("settings.businessName='Coutts Heating'; settings.address='1 Test Road\\nLincoln\\nLN1 1AA'; settings.gasSafeReg='123456'; settings.engineerName='K Coutts'; settings.gasSafeId='7654321'; saveSettings()")
    return ctx, pg, errs


def new_rec(pg, t):
    pg.click('[data-act=newSheet]')
    pg.click(f'#newSheet [data-act=newRec][data-type={t}]')


def ev(pg, js):
    return pg.evaluate(js)


def run():
    with sync_playwright() as p:
        b = p.chromium.launch()

        # ---------- 1. every screen renders ----------
        ctx, pg, errs = fresh(b)
        views = ['home', 'customers', 'invoices', 'settings', 'tools', 'help', 'news', 'feedback', 'due', 'cal']
        for v in views:
            ok = ev(pg, f"(()=>{{ui.view='{v}';try{{render();return document.querySelector('#view').innerText.length>10}}catch(e){{return String(e)}}}})()")
            check(f'view renders: {v}', ok is True, ok)
        for t in ['business', 'money', 'messages', 'calendar', 'app']:
            ok = ev(pg, f"(()=>{{ui.view='settings';ui.sTab='{t}';render();const d=document.querySelector('[data-stab={t}]');return !!d&&!d.hidden&&d.innerText.length>10}})()")
            check(f'settings tab shows: {t}', ok)
        only = ev(pg, "(()=>{ui.view='settings';ui.sTab='money';render();return [...document.querySelectorAll('[data-stab]')].filter(d=>!d.hidden).length})()")
        check('settings shows exactly one tab at a time', only == 1, only)
        check('app version matches service worker cache',
              ev(pg, "fetch('sw.js').then(r=>r.text()).then(t=>t.includes(\"'omb-gas-\"+APP_VERSION+\"'\"))"))
        check('news has an entry for the current version', ev(pg, 'NEWS[0].v === APP_VERSION'))
        check('no page errors while rendering views', not errs, errs)
        ctx.close()

        # ---------- 2. every PDF type builds ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        n = ev(pg, 'records.length')
        check('sample data adds records', n >= 5, n)
        for t in ['gas', 'service', 'legionella', 'aircon', 'warning']:
            r = ev(pg, f"(async()=>{{const rec=records.find(r=>typeOf(r)==='{t}');if(!rec)return 'no record';try{{const b=await buildPdf(rec,settings);return b.size>3000?true:'tiny '+b.size}}catch(e){{return String(e)}}}})()")
            check(f'PDF builds: {t}', r is True, r)
        for t in ['quote', 'commission']:
            r = ev(pg, f"(async()=>{{try{{const rec=newRecord(customers[0],'{t}');const b=await buildPdf(rec,settings);return b.size>3000?true:'tiny '+b.size}}catch(e){{return String(e)}}}})()")
            check(f'PDF builds: {t} (blank form)', r is True, r)
        r = ev(pg, "(async()=>{try{const i=newInvoice([records[0]]);i.lines=[{d:'Service',q:'1',p:'80'}];const b=await buildInvPdf(i,settings);return b.size>3000?true:'tiny'}catch(e){return String(e)}})()")
        check('PDF builds: invoice', r is True, r)
        r = ev(pg, "(async()=>{try{const i=newInvoice([records[0]]);i.lines=[{d:'Service',q:'1',p:'80'}];invoices.push(i);const b=await buildStatementPdf(invoices,settings,{});return b.size>2000?true:'tiny'}catch(e){return String(e)}})()")
        check('PDF builds: accountant statement', r is True, r)
        r = ev(pg, "(async()=>{try{const b=await buildToolsPdf([],{},settings);return b.size>1000?true:'tiny'}catch(e){return String(e)}})()")
        check('PDF builds: tools report', r is True, r)
        for color, label in [('white', 'white'), ('black', 'black'), ('clear', 'clear')]:
            r = ev(pg, f"(async()=>{{settings.logoBg='{color}';_logoW={{k:'',v:''}};try{{const u=await getLogo();return u.length>50}}catch(e){{return String(e)}}}})()")
            check(f'logo background option works: {label}', r is True, r)
        check('no page errors while building PDFs', not errs, errs)
        ctx.close()

        # ---------- 3. records: create from the UI, validation, drafts ----------
        ctx, pg, errs = fresh(b)
        new_rec(pg, 'gas')
        check('new record opens the forms picker', ev(pg, "ui.view==='pick'"))
        pg.click('[data-act=pickGo]')
        check('Start opens the form', ev(pg, "ui.view==='form'"))
        check('a draft record is stored', ev(pg, "records.length===1 && records[0].status==='draft'"))
        ev(pg, "ui.view='home';render()")
        check('draft shows on the home screen', ev(pg, "document.querySelectorAll('[data-act=openRec]').length===1"))
        ev(pg, "records.length=0;saveRecords()")
        check('no page errors in record flow', not errs, errs)
        ctx.close()

        # ---------- 4. customers ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "customers.push({id:'c1',name:'Jane Smith',phone:'07700900123',email:'j@x.com',billing:'',properties:['1 High St\\nLincoln\\nLN1 1AA','2 Low Rd\\nGrantham\\nNG31 1AA']});ui.view='customers';render()")
        check('customer list shows the customer', 'Jane Smith' in ev(pg, "document.querySelector('#view').innerText"))
        pg.fill('#custSearch', 'zzz'); pg.dispatch_event('#custSearch', 'input')
        check('customer search filters', 'Jane Smith' not in ev(pg, "document.querySelector('#custList').innerText"))
        pg.fill('#custSearch', 'jane'); pg.dispatch_event('#custSearch', 'input')
        check('customer search finds a match', 'Jane Smith' in ev(pg, "document.querySelector('#custList').innerText"))
        ev(pg, "ui.cust=JSON.parse(JSON.stringify(customers[0]));ui.cTab='cust';ui.view='custEdit';render()")
        for tab in ['cust', 'nav', 'jobs']:
            pg.click(f'[data-act=cTab][data-t={tab}]')
            shown = ev(pg, "[...document.querySelectorAll('[data-ctab]')].filter(d=>!d.hidden).map(d=>d.dataset.ctab)")
            check(f'customer tab shows only {tab}', shown == [tab], shown)
        check('navigate tab links to maps', ev(pg, "document.querySelectorAll('[data-ctab=nav] a[href*=\\'google.com/maps\\']').length===2"))
        ev(pg, "ui.cust={_new:true,id:'n',name:'',phone:'',email:'',billing:'',properties:[]};ui.view='custEdit';render()")
        check('new customer has no tab bar', ev(pg, "document.querySelectorAll('[data-act=cTab]').length===0"))
        check('no page errors in customers', not errs, errs)
        ctx.close()

        # ---------- 5. invoices ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "settings.payDays='14';const i=newInvoice(null);i.customer.name='Bob';i.lines=[{d:'Boiler service',q:'1',p:'100'},{d:'Part',q:'2',p:'10'}];i.vatRate='20';persistInv(i);ui.inv=i;ui.view='invEdit';render()")
        check('invoice total includes VAT', '144' in ev(pg, "document.querySelector('#invTotals').innerText"), ev(pg, "document.querySelector('#invTotals').innerText"))
        ev(pg, "invoices[0].due='2000-01-01';invoices[0].paid=false;saveInvoices()")
        check('overdue invoice is detected', ev(pg, "invOverdueAsk().length===1"))
        ev(pg, "ui.view='home';render()")
        check('today overdue row opens the invoice', ev(pg, "(()=>{const r=document.querySelector('.line .main[data-act=openInv]'); if(!r) return false; r.click(); return ui.view==='invEdit' || ui.view==='invoices' || ui.inv&&ui.inv.id===invoices[0].id})()"))
        ev(pg, "invoices[0].paid=true;saveInvoices()")
        check('paid invoice is not overdue', ev(pg, "invOverdueAsk().length===0"))
        ev(pg, "ui.view='home';render()")
        check('no page errors in invoices', not errs, errs)
        ctx.close()

        # ---------- 6. quotes and price list ----------
        ctx, pg, errs = fresh(b)
        check('quote price list has boilers', ev(pg, "(settings.qList&&settings.qList.length>20)||QUO.STARTER.length>20"))
        ev(pg, "ui.view='prices';render()")
        check('price list view renders', ev(pg, "document.querySelector('#view').innerText.length>50"))
        ev(pg, "const q=newRecord(null,'quote');q.status='complete';q.qStatus='';q.inspectionDate='2000-01-01';q.qSent=Date.parse('2000-01-02');q.customer={name:'Ann Lee',phone:'07700900111',email:'a@x.com'};records.push(q)")
        check('old unanswered quote needs chasing', ev(pg, "records.filter(qChase).length===1"))
        ev(pg, "records[0].qSent=''")
        check('a quote that was never sent is not chased', ev(pg, "records.filter(qChase).length===0 && quoBadge(records[0]).includes('Not sent yet')"))
        ev(pg, "delete records[0].qSent")
        check('older quotes with no sent record count as sent when made', ev(pg, "records.filter(qChase).length===1 && quoBadge(records[0]).includes('Chase up')"))
        ev(pg, "records[0].qSent=''; ui.view='invoices'; ui.invTab='quotes'; ui.qFilter='all'; render()")
        t_ = ev(pg, "document.querySelector('#view').innerText.toLowerCase()")
        check('Quotes tab shows not sent', 'not sent' in t_, t_[:200])
        ev(pg, "const x=document.createElement('button'); x.id='tSent'; x.dataset.act='qSentToggle'; x.dataset.id=records[0].id; document.body.appendChild(x)")
        pg.click('#tSent'); pg.wait_for_timeout(150)
        ev(pg, "records[0].qSent=''; ui.pdfs[records[0].id]={blob:new Blob(['x'],{type:'application/pdf'}),name:'q.pdf'}; window.canShareFiles=()=>false; window.openMail=()=>{}; window.downloadPdf=()=>{}; sharePdf(records[0])"); pg.wait_for_timeout(200)
        check('sharing a quote by email records that it was sent', ev(pg, "!!records[0].qSent"))
        check('Mark as sent records the day and starts the chase clock', ev(pg, "!!records[0].qSent && qSentDay(records[0])===localISO()"))
        check('chase text fills the name', 'Hi Ann' in ev(pg, "chaseText(records[0])"))
        check('no page errors in quotes', not errs, errs)
        ctx.close()

        # ---------- 7. tools ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.view='tools';render()")
        check('tools screen lists calculators', ev(pg, "document.querySelector('#view').innerText.length>60"))
        check('no page errors in tools', not errs, errs)
        ctx.close()

        # ---------- 8. calendar ----------
        ctx, pg, errs = fresh(b, mobile=True)
        ev(pg, "customers.push({id:'c1',name:'Jane Smith',phone:'07700 900123',email:'',billing:'',properties:['1 High St\\nLincoln\\nLN1 1AA','2 Low Rd\\nGrantham\\nNG31 1AA']},{id:'c2',name:'Janet Brown',phone:'01522 123456',email:'',billing:'',properties:[]});render()")
        check('home shows today\'s appointments but no month grid', ev(pg, "!document.querySelector('.calg') && /today/i.test(document.querySelector('#view').innerText)"))
        new_rec(pg, 'gas'); pg.click('[data-act=bookFromPick]')
        check('Schedule in opens the booking form with the job ticked', ev(pg, "ui.view==='book' && ui.book.types.join()==='gas'"))
        pg.click('[data-bk=name]'); pg.keyboard.type('jan', delay=20)
        check('customer search suggests matches', ev(pg, "document.querySelectorAll('#bkNameSug .cpick').length===2"))
        pg.fill('[data-bk=name]', 'Jane Sm'); pg.dispatch_event('[data-bk=name]', 'input')
        pg.click('#bkNameSug .cpick')
        check('picking a customer fills the details', ev(pg, "ui.book.customerId==='c1' && ui.book.phone==='07700 900123'"))
        check('address list offered with an add-new option', ev(pg, "[...document.querySelectorAll('select[data-bk=propPick] option')].some(o=>o.value==='__new')"))
        check('add-new address is at the top of the address list', ev(pg, "[...document.querySelectorAll('select[data-bk=propPick] option')].filter(o=>o.value!=='').map(o=>o.value)[0]==='__new'"))
        pg.select_option('[data-bk=propPick]', '1')
        check('choosing a saved address sets it', ev(pg, "ui.book.address.startsWith('2 Low Rd')"))
        pg.select_option('[data-bk=propPick]', '__new')
        pg.fill('textarea[data-bk=address]', '9 New Way\nBoston\nPE21 1AA')
        pg.fill('[data-bk=date]', ev(pg, 'localISO()')); pg.fill('[data-bk=time]', '10:30')
        pg.click('[data-act=bookSave]')
        check('booking saves', ev(pg, "bookings.length===1 && bookings[0].time==='10:30'"))
        check('new address is saved on the customer', ev(pg, "customers[0].properties.length===3"))
        pg.click('[data-act=bookNew]'); pg.click('[data-act=bookType][data-t=other]')
        check('Other job opens a box', ev(pg, "!!document.querySelector('[data-bk=other]')"))
        pg.click('[data-act=bookOther][data-i="0"]'); pg.fill('[data-bk=name]', 'Bob'); pg.fill('[data-bk=time]', '10:45')
        pg.click('[data-act=bookSave]')
        check('overlapping booking is allowed after confirming', ev(pg, "bookings.length===2"))
        check('other job label uses what was chosen', ev(pg, "bkLabel(bookings[1])==='Bathroom install'"))
        ev(pg, "ui.view='home';render()")
        check('Today list shows today appointments', ev(pg, "document.querySelectorAll('[data-act=bookOpen]').length>=2"))
        pg.click('[data-act=bookOpen]')
        check('open booking has the on my way button for a mobile', ev(pg, "(()=>{const e=document.querySelector('#bkOtw');return !!e&&e.offsetParent!==null})()"))
        check('open booking has a Navigate button', ev(pg, "!!document.querySelector('a[href*=\"google.com/maps\"]')"))
        pg.fill('[data-bk=phone]', '01522 123456')
        check('landline hides the on my way button', ev(pg, "document.querySelector('#bkOtw').offsetParent===null"))
        check('mobile number formats are recognised', ev(pg, "['07700 900123','+44 7700 900123','+44 (0)7700 900123','(07700) 900123'].every(isMobileNo) && !isMobileNo('01522 123456')"))
        check('on my way text fills the name and time', ev(pg, "/^Hi Jane.*10:30/s.test(otwText({name:'Jane Smith',time:'10:30'}))"))
        ics = ev(pg, 'icsFor(bookings)')
        check('ICS export is valid', ics.startswith('BEGIN:VCALENDAR') and ics.count('BEGIN:VEVENT') == 2 and ics.rstrip().endswith('END:VCALENDAR'))
        check('CSV export has a header and rows', ev(pg, "bkCsv().split('\\r\\n').length===3"))
        pg.click('[data-act=bookStart]')
        check('Start the forms creates a record with the address', ev(pg, "ui.view==='form' && (ui.rec.jobAddress||'').length>3 && bookings.some(b=>b.status==='done')"))
        ev(pg, "settings.calOn='off';ui.view='home';render()")
        check('calendar off hides it from the home screen', ev(pg, "!document.querySelector('.calg') && !document.querySelector('[data-act=bookNew]')"))
        new_rec(pg, 'gas')
        check('calendar off hides Schedule in', ev(pg, "!document.querySelector('[data-act=bookFromPick]')"))
        ev(pg, "settings.calOn='on';settings.calHome='off';ui.view='home';render()")
        check('home screen option hides just the home calendar', ev(pg, "!document.querySelector('.calg')"))
        check('no page errors in the calendar', not errs, errs)
        ctx.close()

        # ---------- 9. cloud sync handling (no network) ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{
          // an appointment pulled from the account must go into bookings, never into invoices
          const row={kind:'booking',id:'bk9',data:{id:'bk9',date:'2026-10-12',time:'09:00',types:['gas'],name:'X',updated:5},updated:5,deleted:false};
          return typeof CLOUD==='object' && typeof CLOUD.sync==='function';
        })()""")
        check('cloud module loads', r)
        src = open('cloud.js').read()
        check('cloud sync handles bookings (push, pull, delete)',
              "kind: 'booking'" in src and "d.kind === 'booking'" in src and 'saveBookings()' in src)
        ev(pg, "localStorage.setItem('omb_invoices',JSON.stringify([{id:'bk1',date:'2026-10-12',time:'09:00',types:['gas']},{id:'i1',lines:[{d:'x',q:'1',p:'5'}],customer:{name:'A'}}]));localStorage.removeItem('omb_bkfix')")
        pg.reload(); pg.wait_for_function("typeof APP_VERSION==='string' && !!document.querySelector('#view')"); pg.evaluate("document.querySelector('#gate') && document.querySelector('#gate').remove()")
        check('stray appointment is removed from invoices on start-up', ev(pg, "invoices.length===1 && invoices[0].id==='i1'"))
        ctx.close()

        # ---------- 10. backup and restore ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "customers.push({id:'c1',name:'Jane',phone:'1',email:'',billing:'',properties:[],updated:1});bookings.push({id:'b1',date:'2026-10-12',time:'09:00',mins:'60',types:['gas'],name:'Jane',updated:1});saveCustomers();saveBookings()")
        src = open('app.js').read()
        check('backup includes appointments', 'invoices, bookings, photos' in src)
        check('restore merges appointments', "d.bookings || []" in src)
        ev(pg, "bookings.length=0;saveBookings()")
        blob = json.dumps({'app': 'omb-gas', 'version': 1, 'settings': {}, 'customers': [], 'records': [], 'invoices': [], 'bookings': [{'id': 'b1', 'date': '2026-10-12', 'time': '09:00', 'mins': '60', 'types': ['gas'], 'name': 'Jane', 'updated': 1}]})
        ev(pg, f"(async()=>{{await restoreBackup(new File([{json.dumps(blob)}],'b.json'))}})()")
        pg.wait_for_timeout(300)
        check('restoring a backup brings appointments back', ev(pg, "bookings.length===1"))
        r = ev(pg, "(async()=>{await restoreBackup(new File(['not json'],'x.json'));return true})()")
        check('a bad backup file is refused without crashing', r is True and not errs, errs)
        ctx.close()

        # ---------- 11. help guide ----------
        ctx, pg, errs = fresh(b)
        n = ev(pg, "HELP.length")
        check('help guide has topics', n >= 20, n)
        check('every help topic has a title, keywords and text', ev(pg, "HELP.every(x=>x&&x.t&&x.k&&x.h)"))
        ev(pg, "ui.view='help';ui.helpQ='';render()")
        pg.fill('#helpSearch', 'calendar'); pg.dispatch_event('#helpSearch', 'input')
        check('help search finds the calendar topic', 'Calendar and appointments' in ev(pg, "document.querySelector('#view').innerText"))
        ctx.close()


        # ---------- 12. form validation ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        for t in ['gas', 'service', 'legionella', 'aircon']:
            r = ev(pg, f"(()=>{{const blank=newRecord(null,'{t}');const done=records.find(r=>typeOf(r)==='{t}');const v=x=>{{const o=validate(x);return Array.isArray(o)?o.length:Object.keys(o||{{}}).length}};return [v(blank),v(done)]}})()")
            check(f'validation flags a blank {t} form and passes the finished example', r[0] > 0 and r[1] == 0, r)
        check('no page errors in validation', not errs, errs)
        ctx.close()

        # ---------- 12b. calendar extras: book from annual checks, tomorrow reminders, week view ----------
        ctx, pg, errs = fresh(b, mobile=True)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          records.filter(x=>typeOf(x)==='gas').forEach(g=>{g.renewal=addDays(localISO(),300)}); const rec=records.find(x=>typeOf(x)==='service'); rec.status='complete'; rec.inspectionDate=localISO(); rec.renewal=addDays(localISO(),10); rec.customerId=''; persistRec(rec);
          ui.view='due'; render();
          const btn=document.querySelector('[data-act=remBook]'); if(!btn) return 'no button';
          btn.click(); return null})()""")
        pg.wait_for_timeout(300)
        r2 = ev(pg, "({v:ui.view,from:ui.bookFrom,types:ui.book&&ui.book.types,fr:ui.book&&ui.book.fromRem,d:ui.book&&ui.book.date})")
        check('Book it in opens a booking for the due check', r is None and r2['v'] == 'book' and r2['from'] == 'due' and r2['types'] == ['service'] and r2['fr'], [r, r2])
        ev(pg, "ui.book.name='Mrs Test'; ui.book.phone='07700900123'; render(); document.querySelector('[data-act=bookSave]').click()")
        pg.wait_for_timeout(300)
        r3 = ev(pg, "({v:ui.view,n:bookings.length,st:remStateOf(records.find(x=>x.id===(bookings[bookings.length-1]||{}).fromRem))})")
        check('saving returns to Annual checks and marks it booked in', r3['v'] == 'due' and r3['n'] >= 1 and r3['st'] == 'booked', r3)
        ev(pg, "bookings.push({id:'tm1',date:addDays(localISO(),1),time:'10:00',mins:'60',types:['service'],name:'Bob Smith',phone:'07700900456',email:'b@x.com',address:'1 A St',status:'booked'}); ui.view='cal'; ui.calMode='today'; render()")
        h = ev(pg, "document.querySelector('#view').innerHTML")
        check('tomorrow reminder shows Text and Email buttons', 'sms:07700900456' in h and 'mailto:b%40x.com' in h and 'tomorrow%20at%2010%3A00' in h, h[:80])
        ev(pg, "document.querySelector('[data-act=calRemSent]').addEventListener('click',e=>e.preventDefault()); document.querySelector('[data-act=calRemSent]').click()")
        pg.wait_for_timeout(1000)
        check('sending a reminder marks it reminded', ev(pg, "!!bookings.find(x=>x.id==='tm1').remindedAt") and 'reminded' in ev(pg, "document.querySelector('#view').innerText").lower())
        ev(pg, "bookings.push({id:'tm2',date:addDays(localISO(),1),time:'11:00',mins:'60',types:['gas'],name:'Cy Dee',phone:'07700900789',address:'',status:'booked'}); render()")
        check('Remind all shows how many are left', 'text next customer (1 left)' in ev(pg, "document.querySelector('#view').innerText").lower())
        ev(pg, "document.querySelector('[data-act=calRemAll]').click()")
        pg.wait_for_timeout(300)
        check('Remind all marks the next customer and the count drops', ev(pg, "!!bookings.find(x=>x.id==='tm2').remindedAt") and 'text next customer' not in ev(pg, "document.querySelector('#view').innerText").lower())
        ev(pg, "settings.calRemOn='off'; render()")
        check('tomorrow reminders can be switched off', 'sms:07700900456' not in ev(pg, "document.querySelector('#view').innerHTML"))
        ev(pg, "settings.calRemOn='on'; ui.calMode='week'; ui.cal=null; render()")
        w = ev(pg, "(()=>{const t=document.querySelector('#view').innerText;return [t.includes('Add'),document.querySelectorAll('.wkd').length,document.querySelectorAll('[data-act=bookOpen]').length>=0]})()")
        check('week view lists seven days', w[1] == 7, w)
        ev(pg, "document.querySelector('[data-act=calWeek][data-n=\"1\"]').click()")
        check('week view moves to next week', ev(pg, "ui.cal.w===addDays(mondayOf(localISO()),7)"))
        ev(pg, "ui.book=null; document.querySelector('.wkd [data-act=bookNew]').click()")
        check('week view + Add starts a booking for that day', ev(pg, "ui.view==='book'&&ui.book.date===addDays(mondayOf(localISO()),7)"))
        check('no page errors in calendar extras', not errs, errs)
        ctx.close()

        # ---------- 12c. customer import and yearly summary ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "customers.push({id:'c0',name:'Ann Old',phone:'07700 900111',email:'',billing:'',properties:[],updated:1})")
        csv = 'Name;Mobile;Email;Address;City;Postcode\r\n"Ann Old";07700900111;;1 X St;Lincoln;LN1 1AA\r\n"Bob, ""Bobby"" Jones";07700 900222;bob@x.com;"2 Y Rd\nFlat 3";Lincoln;LN2 2BB\r\n;07700900333;;;;\r\nCara Lee;;cara@x.com;;;'
        ev(pg, "ui.view='import'; render()")
        pg.set_input_files('#impFile', files=[{'name': 'c.csv', 'mimeType': 'text/csv', 'buffer': csv.encode()}])
        pg.wait_for_timeout(400)
        I = ev(pg, "({f:ui.imp.fresh.map(c=>c.name),d:ui.imp.dupes,b:ui.imp.blank,a:ui.imp.fresh[0]&&ui.imp.fresh[0].properties[0],p:ui.imp.fresh[0]&&ui.imp.fresh[0].phone})")
        check('CSV import: reads quotes, semicolons, skips duplicates and blank names', I['f'] == ['Bob, "Bobby" Jones', 'Cara Lee'] and I['d'] == 1 and I['b'] == 1, I)
        check('CSV import: builds the address from several columns', I['a'] == '2 Y Rd\nFlat 3\nLincoln\nLN2 2BB', I)
        ev(pg, "document.querySelector('[data-act=impGo]').click()")
        pg.wait_for_timeout(300)
        check('CSV import: adds the new customers', ev(pg, "customers.length===3&&customers.some(c=>c.name==='Cara Lee'&&c._dirty)"))
        ev(pg, "SAMPLE.add(); const T=localISO().slice(0,4); invoices.push({id:'i1',number:'1',date:T+'-03-05',due:T+'-04-05',paid:true,paidDate:T+'-03-20',payMethod:'Cash',customer:{name:'Zed'},lines:[{d:'x',q:'1',p:'100'}],vatRate:'20',disc:''},{id:'i2',number:'2',date:T+'-04-05',due:T+'-05-05',paid:false,customer:{name:'Yan'},lines:[{d:'x',q:'2',p:'50'}],vatRate:'0',disc:''}); ui.view='summary'; render()")
        S = ev(pg, "(()=>{const D=sumData(ui.sumYear);return [D.tot.n,D.tot.net,D.tot.vat,D.tot.total,D.tot.paid,document.querySelector('#view').innerText.includes('Yearly summary')]})()")
        check('yearly summary adds up invoices, VAT and paid', S[0] == 2 and S[1] == 200 and S[2] == 20 and S[3] == 220 and S[4] == 120 and S[5], S)
        c = ev(pg, "sumCsv(ui.sumYear)")
        check('accounts export has a header and one row per invoice', c.count('\r\n') == 2 and 'Invoice date' in c and '100.00' in c and '"Zed"' in c, c[:120])
        ev(pg, "ui.view='settings'; ui.sTab='app'; render()")
        pg.click('[data-act=impOpen]'); pg.wait_for_timeout(200)
        check('customer import is opened from Settings > App', ev(pg, "ui.view")=='import')
        ev(pg, "ui.view='customers'; render()")
        check('customer list no longer has the import button', not ev(pg, "!!document.querySelector('#view [data-act=impOpen]')"))
        sub = lambda v: (ev(pg, "ui.view='%s'; render()" % v), ev(pg, "document.getElementById('barSub').textContent"))[1]
        got = [sub(v) for v in ['home', 'customers', 'invoices', 'tools', 'settings', 'cal']]
        check('header subtitle follows the section', got == ['Today', 'Customers', 'Invoices', 'Tools', 'Settings', 'Calendar'], got)
        check('no page errors in import/summary', not errs, errs)
        ctx.close()

        # ---------- 12d. storage moved from localStorage to IndexedDB ----------
        ctx, pg, errs = fresh(b)
        pg.evaluate("localStorage.setItem('omb_customers', JSON.stringify([{id:'old1',name:'Old Customer',phone:'',email:'',billing:'',properties:[],updated:1}])); localStorage.setItem('omb_bookings','[]')")
        pg.reload(); pg.wait_for_function("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
        st = ev(pg, "({n:customers.map(c=>c.name),ls:localStorage.getItem('omb_customers'),has:OMBSTORE.has('omb_customers')})")
        check('old data is moved into the database and the old copy removed', st['n'] == ['Old Customer'] and st['ls'] is None and st['has'], st)
        ev(pg, "customers.push({id:'n2',name:'New One',phone:'',email:'',billing:'',properties:[],updated:2}); saveCustomers()")
        pg.wait_for_timeout(500)
        pg.reload(); pg.wait_for_function("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
        check('changes are still there after closing and reopening', ev(pg, "customers.map(c=>c.name).join()") == 'Old Customer,New One')
        big = ev(pg, "(()=>{SAMPLE.add(); const base=records[0]; for(let i=0;i<3000;i++){records.push({...JSON.parse(JSON.stringify(base)),id:'big'+i,notes:'x'.repeat(4000)})} saveRecords(); return JSON.stringify(records).length})()")
        pg.wait_for_timeout(1500)
        pg.reload(); pg.wait_for_function("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
        n = ev(pg, "records.length")
        check(f'far more than 5 MB of records can be kept ({big // 1048576} MB)', big > 12e6 and n > 3000, [big, n])
        check('no page errors moving storage', not errs, errs)
        ctx.close()
        ctx = b.new_context(viewport={'width': 390, 'height': 800})
        ctx.add_init_script("Object.defineProperty(window,'indexedDB',{get(){throw new Error('no idb')}})")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
        ev(pg, "customers.push({id:'f1',name:'Fallback',phone:'',email:'',billing:'',properties:[],updated:1}); saveCustomers()")
        pg.reload(); pg.wait_for_function("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
        check('with no database available the app falls back to localStorage', ev(pg, "customers.some(c=>c.name==='Fallback')") and not errs, errs)
        ctx.close()

        # ---------- 12e. invoice: add from price list ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "settings.qList=[{id:'pl1',type:'Other',make:'',name:'Room thermostat',kind:'',kw:'',cost:'20',markup:'50',price:''},{id:'pl2',type:'Other',make:'',name:'Copper pipe 15mm',kind:'',kw:'',cost:'',markup:'',price:'4.50'}]; saveSettings(); ui.inv=newInvoice(null); invoices.push(ui.inv); ui.view='invEdit'; render()")
        ev(pg, "document.querySelector('[data-act=invPl]').click()")
        pg.fill('#invPlQ', 'thermo')
        n = ev(pg, "document.querySelectorAll('[data-act=invPlPick]').length")
        ev(pg, "document.querySelector('[data-act=invPlPick]').click()")
        L = ev(pg, "ui.inv.lines")
        check('invoice price list search finds the item and adds it at the sale price', n == 1 and len(L) == 1 and L[0]['d'] == 'Room thermostat' and L[0]['p'] == '30', [n, L])
        ev(pg, "document.querySelector('[data-act=invPl]').click()"); pg.fill('#invPlQ', 'copper'); ev(pg, "document.querySelector('[data-act=invPlPick]').click()")
        check('a second price list item is added as another line', ev(pg, "ui.inv.lines.map(l=>l.p).join()") == '30,4.50')
        check('no page errors adding from the price list', not errs, errs)
        ctx.close()

        # ---------- 12f. invoice discount in pounds or percent ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.inv=newInvoice(null); ui.inv.lines=[{d:'a',q:'2',p:'100'}]; ui.inv.vatRate='20'; invoices.push(ui.inv); ui.view='invEdit'; render()")
        ev(pg, "document.querySelector('[data-act=invDiscMode][data-m=\"%\"]').click()")
        ev(pg, "ui.inv.disc='10'; render()")
        T = ev(pg, "invTotals(ui.inv)")
        check('percent discount comes off the subtotal before VAT', T['sub'] == 200 and T['disc'] == 20 and T['net'] == 180 and T['vat'] == 36, T)
        check('percent discount is named on the invoice', ev(pg, "discName(ui.inv)") == 'Discount (10%)')
        ev(pg, "document.querySelector('[data-act=invDiscMode][data-m=\"£\"]').click()")
        pg.wait_for_timeout(200)
        ev(pg, "ui.inv.disc='15'")
        check('pound discount still works and switching clears the old value', ev(pg, "invTotals(ui.inv).disc") == 15 and ev(pg, "discName(ui.inv)") == 'Discount')
        check('no page errors in discount types', not errs, errs)
        ctx.close()

        # ---------- 12g. invoice lines heading ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.inv=newInvoice(null); invoices.push(ui.inv); ui.view='invEdit'; render()")
        h1 = ev(pg, "[...document.querySelectorAll('#view h2')].map(h=>h.innerText).join('|')").lower()
        ev(pg, "settings.invHead='Parts and labour'; render()")
        h2 = ev(pg, "[...document.querySelectorAll('#view h2')].map(h=>h.innerText).join('|')").lower()
        check('invoice lines heading defaults to Work and materials and can be changed', 'work and materials' in h1 and 'services' not in h1 and 'parts and labour' in h2, [h1, h2])
        check('no page errors in invoice heading', not errs, errs)
        ctx.close()

        # ---------- 12h. quote for any job ----------
        ctx, pg, errs = fresh(b)
        new_rec(pg, 'gquote')
        pg.wait_for_timeout(300)
        g = ev(pg, "({g:ui.rec.general,v:ui.view,steps:stepsOf(ui.rec).join('|'),issues:validate(ui.rec).map(x=>x.label)})")
        check('Quote for any job starts with its own steps and asks for the job', g['g'] and g['v'] == 'form' and g['steps'] == 'Customer|The job|Items & labour|Review' and 'What the job is' in g['issues'] and 'Boiler make' not in g['issues'], g)
        ev(pg, "ui.rec.customer.name='Mr Test'; ui.rec.jobAddress='1 A St\\nLincoln'; ui.rec.title='Bathroom installation'; ui.rec.scope='Strip out old suite\\nFit new suite'; ui.rec.lines=[{name:'Bath',qty:'1',price:'300'},{name:'Basin',qty:'2',price:'80'}]; ui.step=1; render()")
        check('quote for any job form shows the job title box', 'What is the job?' in ev(pg, "document.querySelector('#view').innerText"))
        ok = ev(pg, "validate(ui.rec).length")
        check('quote for any job is valid with a title and priced items, no boiler needed', ok == 0, ok)
        n = ev(pg, "buildPdf(ui.rec, settings).then(b=>b.size)")
        check('quote for any job builds a PDF', n > 5000, n)
        ev(pg, "ui.step=3; render()")
        check('quote review shows the job and total', 'Bathroom installation' in ev(pg, "document.querySelector('#view').innerText") and 'quote total' in ev(pg, "document.querySelector('#view').innerText").lower())
        check('no page errors in quote for any job', not errs, errs)
        ctx.close()

        # ---------- 12i. calendar tab and annual checks inside the calendar ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "SAMPLE.add(); records.filter(x=>typeOf(x)==='gas').forEach(g=>{g.renewal=addDays(localISO(),300)}); const r=records.find(x=>typeOf(x)==='service'); r.status='complete'; r.inspectionDate=localISO(); r.renewal=addDays(localISO(),10); persistRec(r); ui.view='home'; render()")
        check('bottom bar has a Calendar tab', 'Calendar' in ev(pg, "[...document.querySelectorAll('.tabs button')].map(b=>b.innerText).join(',')"))
        check('Annual checks due is a single row inside the calendar block on home, not a separate button', ev(pg, "document.querySelectorAll('#view [data-act=remOpen]').length") == 1)
        pg.click('.tabs [data-act=calOpen]'); pg.click('.cals [data-act=remOpen]')
        check('Due button in the calendar lists the annual checks', ev(pg, "ui.view==='due'&&!!document.querySelector('[data-act=remBook]')&&!!document.querySelector('.cals')"))
        ev(pg, "settings.calOn='off'; ui.view='home'; render()")
        check('with the calendar off, Annual checks due is back on Records and no Calendar tab', 'Calendar' not in ev(pg, "[...document.querySelectorAll('.tabs button')].map(b=>b.innerText).join(',')") and ev(pg, "!!document.querySelector('[data-act=remOpen]')"))
        check('no page errors in calendar tab', not errs, errs)
        ctx.close()

        # ---------- 12j. screen keeps its position when picking an address ----------
        ctx, pg, errs = fresh(b, mobile=True)
        ev(pg, "customers.push({id:'cz',name:'Pat Long',phone:'',email:'',billing:'',properties:['1 A St\\nLincoln','2 B Rd\\nGrantham']}); ui.pick={types:{gquote:true},customer:customers[0]}; startJob(); document.body.style.minHeight='3000px'; window.scrollTo(0,400)")
        pg.wait_for_timeout(200)
        y0 = ev(pg, "window.scrollY")
        ev(pg, "document.querySelector('[data-act=pickProp]') ? document.querySelector('[data-act=pickProp]').click() : render()")
        pg.wait_for_timeout(200)
        check('picking the work address in a form keeps your place on the page', y0 > 100 and ev(pg, "window.scrollY") == y0, [y0, ev(pg, "window.scrollY")])
        ev(pg, "ui.rec.customer.name='x'; ui.rec.jobAddress='y'; ui.step=1; render()")
        check('moving to the next step still goes back to the top', ev(pg, "window.scrollY") == 0)
        check('no page errors keeping position', not errs, errs)
        ctx.close()

        # ---------- 12k. quote for any job: start from a previous job ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.pick={types:{gquote:true},customer:null}; startJob(); ui.rec.title='Bathroom installation'; ui.rec.scope='Strip out\\nFit suite'; ui.rec.labourPrice='400'; ui.rec.labourQty='2'; ui.rec.lines=[{desc:'Suite',qty:'1',price:'900'}]; ui.rec.status='complete'; persistRec(ui.rec); ui.pick={types:{gquote:true},customer:null}; startJob(); ui.step=1; render()")
        n = ev(pg, "document.querySelectorAll('[data-qprev] option').length")
        pg.select_option('[data-qprev]', index=1)
        pg.wait_for_timeout(200)
        r = ev(pg, "[ui.rec.title, ui.rec.scope]")
        check('previous job list brings in the title and what is included', n == 2 and r == ['Bathroom installation', 'Strip out\nFit suite'], [n, r])
        r2 = ev(pg, "[ui.rec.labourPrice, ui.rec.labourQty, ui.rec.lines.length, ui.rec.lines[0] && ui.rec.lines[0].price]")
        check('previous job list also copies items and prices', r2 == ['400', '2', 1, '900'], r2)
        check('no page errors in previous job list', not errs, errs)
        ctx.close()

        # ---------- 12l. price list: own categories ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.view='prices'; render(); document.querySelector('[data-act=pNewCat]').click()")
        pg.fill('#pCatIn', 'Baths'); ev(pg, "document.querySelector('[data-act=pCatAdd]').click()")
        pg.wait_for_timeout(200)
        c = ev(pg, "({cat:ui.pCat,tab:[...document.querySelectorAll('[data-act=pCat]')].some(b=>b.innerText.startsWith('Baths')),saved:settings.qCats})")
        check('new price list category appears in the list and is saved', c['cat'] == 'Baths' and c['tab'] and c['saved'] == ['Baths'], c)
        ev(pg, "document.querySelector('[data-act=pAdd]').click()")
        ev(pg, "settings.qList.find(x=>x.type==='Baths').name='Double ended bath'; settings.qList.find(x=>x.type==='Baths').price='320'; saveSettings(); render()")
        check('an item can be added to the new category and shows in quote extras', ev(pg, "qExtraList().some(x=>x.type==='Baths'&&x.name==='Double ended bath')"))
        check('no page errors in price list categories', not errs, errs)
        ctx.close()

        # ---------- 12m. price list: stacked categories that open when tapped ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "document.querySelector('[data-act=pricesOpen]') ? 0 : (ui.view='settings')"); ev(pg, "qSeed(); ui.pCat=''; ui.view='prices'; render()")
        closed = ev(pg, "[document.querySelectorAll('[data-act=pCat]').length>5, document.querySelectorAll('[data-act=pAdd]').length, document.querySelectorAll('[data-pi]').length]")
        check('price list shows stacked categories with nothing open at first', closed[0] and closed[1] == 0 and closed[2] == 0, closed)
        a = {}
        for c in ['Boiler', 'Flue']:
            ev(pg, f"document.querySelector('[data-act=pCat][data-c={c}]').click()")
            a[c] = ev(pg, "(()=>{const add=document.querySelector('[data-act=pAdd]').getBoundingClientRect().top, head=document.querySelector('[data-act=pCat].item, [data-act=pCat]').getBoundingClientRect().top, open=document.querySelector('[data-act=pCat][data-c=%s]').getBoundingClientRect().top; return Math.round(add-open)})()" % c)
        check('Add button sits straight under the open category, for Boiler and Flue alike', abs(a['Boiler'] - a['Flue']) < 80, a)
        ev(pg, "document.querySelector('[data-act=pCat][data-c=Flue]').click()")
        check('tapping the open category closes it', ev(pg, "document.querySelectorAll('[data-act=pAdd]').length") == 0)
        check('no page errors in stacked price list', not errs, errs)
        ctx.close()

        # ---------- 12n. labour by the hour or day ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "settings.qList=[{id:'lb1',type:'Labour',make:'',name:'Hourly rate',kind:'',kw:'',cost:'',markup:'',price:'45',unit:'hour'}]; settings.qRates=1; saveSettings(); ui.pCat='Labour'; ui.pEdit='lb1'; ui.view='prices'; render()")
        f = ev(pg, "[!!document.querySelector('[data-pi=make]'), !!document.querySelector('[data-pi=unit]'), document.querySelector('#view').innerText.includes('Rate name')]")
        check('labour price list item has no make or model, just a name and charged per', f == [False, True, True], f)
        ev(pg, "ui.pick={types:{gquote:true},customer:null}; startJob(); ui.step=2; render(); qPick('labour', 0)")
        r = ev(pg, "(()=>{ui.rec.labourQty='6'; return [ui.rec.labourUnit, ui.rec.labourPrice, QUO.rows(ui.rec).map(x=>x.q+'x'+x.p).join(), QUO.totals(ui.rec,settings).total]})()")
        check('labour on a quote is charged by the hour or day', r[0] == 'hour' and r[1] == '45' and r[2] == '6x45' and r[3] == 324, r)
        check('no page errors in labour rates', not errs, errs)
        ctx.close()

        # ---------- 12o. import appointments from another calendar ----------
        ctx, pg, errs = fresh(b)
        ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:abc1@google.com\r\nDTSTART:20991105T093000Z\r\nDTEND:20991105T103000Z\r\nSUMMARY:Boiler look\\, Mrs Hall\r\nLOCATION:5 Elm Rd\\, Lincoln\r\nDESCRIPTION:Bring a long\r\n  flue\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:abc2@apple.com\r\nDTSTART;VALUE=DATE:20991106\r\nSUMMARY:Day off\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:old@x.com\r\nDTSTART:20200101T090000Z\r\nSUMMARY:Old one\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:x@x\r\nDTSTART:20991107T090000Z\r\nSTATUS:CANCELLED\r\nSUMMARY:Gone\r\nEND:VEVENT\r\nEND:VCALENDAR'
        ev(pg, "ui.view='settings'; ui.sTab='calendar'; render()")
        pg.set_input_files('#calImpFile', files=[{'name': 'cal.ics', 'mimeType': 'text/calendar', 'buffer': ics.encode()}])
        pg.wait_for_timeout(300)
        I = ev(pg, "({n:ui.calImp.fresh.length,past:ui.calImp.past,c:ui.calImp.cancelled,a:ui.calImp.fresh[0]&&[ui.calImp.fresh[0].name,ui.calImp.fresh[0].address,ui.calImp.fresh[0].notes,ui.calImp.fresh[0].mins],d:ui.calImp.fresh[1]&&[ui.calImp.fresh[1].time,ui.calImp.fresh[1].mins]})")
        check('calendar file import reads events, skips past and cancelled ones', I['n'] == 2 and I['past'] == 1 and I['c'] == 1, I)
        check('calendar import keeps the title, place, notes and length; all-day becomes a day', I['a'] and I['a'][0] == 'Boiler look, Mrs Hall' and I['a'][1] == '5 Elm Rd, Lincoln' and 'long' in I['a'][2] and I['a'][3] == '60' and I['d'][1] == '480', I)
        ev(pg, "document.querySelector('[data-act=calImpGo]').click()"); pg.wait_for_timeout(200)
        pg.set_input_files('#calImpFile', files=[{'name': 'cal.ics', 'mimeType': 'text/calendar', 'buffer': ics.encode()}]); pg.wait_for_timeout(300)
        check('importing the same file again adds nothing twice', ev(pg, "bookings.length===2&&ui.calImp.fresh.length===0&&ui.calImp.dupes===2"))
        check('no page errors in calendar import', not errs, errs)
        ctx.close()

        # ---------- 12p. calendar default view ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "settings.calView='week'; saveSettings(); ui.view='home'; render(); document.querySelector('.tabs [data-act=calOpen]').click()")
        pg.wait_for_timeout(300)
        w = ev(pg, "[ui.view, ui.calMode, document.querySelectorAll('.wkd').length]")
        ev(pg, "settings.calView='month'; ui.view='home'; render(); document.querySelector('.tabs [data-act=calOpen]').click()"); pg.wait_for_timeout(300)
        mth = ev(pg, "[ui.calMode, !!document.querySelector('.calg')]")
        ev(pg, "settings.calView=''; ui.view='home'; render(); document.querySelector('.tabs [data-act=calOpen]').click()"); pg.wait_for_timeout(300)
        check('calendar opens on the view chosen in settings (week, month, default today)', w == ['cal', 'week', 7] and mth == ['month', True] and ev(pg, "ui.calMode") == 'today', [w, mth])
        check('no page errors in calendar default view', not errs, errs)
        ctx.close()

        # ---------- 12q. hourly and day rates in an existing labour price list ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "settings.qList=[{id:'x1',type:'Labour',make:'',name:'Installation labour: Combi swap',kind:'',kw:'',cost:'',markup:'',price:'600'}]; delete settings.qRates; saveSettings(); qSeed()")
        L = ev(pg, "settings.qList.filter(x=>x.type==='Labour').map(x=>x.name+':'+x.unit)")
        ev(pg, "settings.qList=settings.qList.filter(x=>x.name!=='Day rate'); saveSettings(); qSeed()")
        check('existing price lists get an Hourly rate and a Day rate once, and deleting one sticks', L[:2] == ['Hourly rate:hour', 'Day rate:day'] and len(L) == 3 and ev(pg, "settings.qList.filter(x=>x.name==='Day rate').length") == 0, L)
        check('no page errors adding labour rates', not errs, errs)
        ctx.close()

        # ---------- 12r. names get capital letters ----------
        ctx, pg, errs = fresh(b)
        P = ev(pg, "['jane smith','mr & mrs o\\'brien','anna smith-jones','Ian McDonald','DAVIES','greenfield lettings ltd','jan van der berg'].map(properName)")
        check('names get a capital on each lower-case word and keep existing capitals', P == ['Jane Smith', "Mr & Mrs O'Brien", 'Anna Smith-Jones', 'Ian McDonald', 'DAVIES', 'Greenfield Lettings Ltd', 'Jan van der Berg'], P)
        ev(pg, "customers.push({id:'n1',name:'bob jones',phone:'',email:'',billing:'',properties:[]}); invoices.push({id:'nv1',number:'1',date:todayISO(),customer:{name:'bob jones'},lines:[],vatRate:'0'}); bookings.push({id:'nb1',date:todayISO(),time:'09:00',mins:'60',types:['gas'],name:'bob jones',status:'booked'}); nameTidy()")
        check('saved names are tidied once on customers, invoices and appointments', ev(pg, "[customers[0].name, invoices[0].customer.name, bookings[0].name].join('|')") == 'Bob Jones|Bob Jones|Bob Jones')
        ev(pg, "ui.view='custEdit'; ui.cust={_new:true,id:'z',name:'',phone:'',email:'',billing:'',properties:[]}; render()")
        pg.fill('[data-c=name]', 'cara lee'); pg.press('[data-c=name]', 'Tab')
        check('typing a customer name tidies it when you leave the box', ev(pg, "ui.cust.name") == 'Cara Lee' and pg.input_value('[data-c=name]') == 'Cara Lee', ev(pg, "ui.cust.name"))
        check('no page errors tidying names', not errs, errs)
        ctx.close()

        # ---------- 12t. Sales tab: invoices and quotes ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.pick={types:{gquote:true},customer:null}; startJob(); ui.rec.title='Bath'; ui.rec.customer.name='Ann Lee'; ui.rec.status='complete'; ui.rec.labourPrice='100'; persistRec(ui.rec); ui.view='home'; render()")
        lab = ev(pg, "document.querySelector('nav.tabs').innerText.toLowerCase()")
        check('bottom tab is called Sales', 'sales' in lab and 'invoices' not in lab, lab)
        pg.click('nav.tabs button[data-nav=invoices]'); pg.wait_for_timeout(150)
        check('Sales opens on Invoices with a Quotes tab', ev(pg, "!!document.querySelector('[data-act=invTab][data-t=quotes]') && document.querySelector('#view h1').innerText==='Invoices'"))
        pg.click('[data-act=invTab][data-t=quotes]'); pg.wait_for_timeout(150)
        txt_ = ev(pg, "document.querySelector('#view').innerText")
        check('Quotes tab lists the quote with its status', 'Ann Lee' in txt_ and 'Awaiting reply' in txt_.replace('AWAITING REPLY','Awaiting reply') or 'awaiting reply' in txt_.lower(), txt_[:300])
        pg.click('#view .item[data-act=openRec]'); pg.wait_for_timeout(150)
        ev(pg, "exitForm()"); pg.wait_for_timeout(150)
        check('Back from a quote returns to the Quotes list', ev(pg, "ui.view==='invoices' && ui.invTab==='quotes'"))
        ev(pg, "ui.rec=records[0]; ui.view='form'; ui.job=null; const x=document.createElement('button'); x.id='tDone'; x.dataset.act='done'; document.body.appendChild(x)")
        pg.click('#tDone'); pg.wait_for_timeout(150)
        check('Done on a quote goes back to Quotes, not Services', ev(pg, "ui.view==='invoices' && ui.invTab==='quotes'"))
        check('no page errors on the Sales tab', not errs, errs)
        ctx.close()

        # ---------- 12u. accepted quote: schedule into the calendar ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.pick={types:{gquote:true},customer:null}; startJob(); ui.rec.title='Bath'; ui.rec.customer.name='Ann Lee'; ui.rec.jobAddress='1 Road'; ui.rec.status='complete'; ui.rec.labourPrice='100'; persistRec(ui.rec); ui.view='invoices'; ui.invTab='quotes'; render()")
        check('no schedule button until the quote is accepted', ev(pg, "!document.querySelector('[data-act=quoBook]')"))
        ev(pg, "records[0].qStatus='accepted'; render()")
        ev(pg, "ui.qFilter='all'; render()")
        chip = ev(pg, "[...document.querySelectorAll('.chip')].map(c=>c.innerText)")
        check('To schedule filter shows accepted quotes not in the calendar', any('to schedule' in c.lower() and '(1)' in c for c in chip), chip)
        pg.click('[data-f=sched]'); pg.wait_for_timeout(100)
        check('To schedule filter lists the quote', ev(pg, "document.querySelectorAll('#view .item[data-act=openRec]').length") == 1)
        pg.click('[data-act=quoBook]'); pg.wait_for_timeout(150)
        bk = ev(pg, "[ui.view, ui.book.name, ui.book.address, ui.book.other, ui.book.types.join()]")
        check('Schedule button opens a booking filled in from the quote', bk == ['book', 'Ann Lee', '1 Road', 'Bath', 'other'], bk)
        pg.click('[data-act=bookSave]'); pg.wait_for_timeout(200)
        st = ev(pg, "[ui.view, ui.invTab, !!records[0].qBooked, bookings.length, !!document.querySelector('[data-act=quoBook]')]")
        check('saving the booking marks the quote booked and returns to Quotes', st == ['invoices', 'quotes', True, 1, False], st)
        ev(pg, "ui.qFilter='all'; render()")
        check('To schedule filter disappears once booked', not ev(pg, "!!document.querySelector('[data-f=sched]')"))
        ev(pg, "ui.book={...bookings[0]}; ui.view='book'; render()")
        pg.click('[data-act=bookForm]'); pg.wait_for_timeout(150)
        oq = ev(pg, "[ui.view, ui.rec && ui.rec.id === records[0].id]")
        check('an appointment made from a quote can open that quote', oq == ['form', True], oq)
        # forms made from an appointment can be opened again, including older appointments matched by customer and day
        ev(pg, "ui.pick={types:{service:true},customer:null}; startJob(); ui.rec.customer.name='Old Cust'; ui.rec.inspectionDate='2026-01-05'; ui.rec.status='complete'; persistRec(ui.rec); bookings.push({id:'bk9',date:'2026-01-05',time:'09:00',mins:'60',types:['service'],customerId:'',name:'Old Cust',phone:'',email:'',address:'',notes:'',status:'done'}); ui.book={...bookings[bookings.length-1]}; ui.view='book'; render()")
        n = ev(pg, "document.querySelectorAll('[data-act=bookForm]').length")
        check('older appointment lists the forms made that day', n == 1, n)
        pg.click('[data-act=bookForm]'); pg.wait_for_timeout(150)
        check('tapping a form opens it', ev(pg, "ui.view==='form' && ui.rec.customer.name==='Old Cust'"))
        ev(pg, "exitForm()"); pg.wait_for_timeout(150)
        check('Back from a form opened from an appointment returns to the appointment', ev(pg, "ui.view==='book' && ui.book.id==='bk9'"))
        pg.click('[data-act=bookForm]'); pg.wait_for_timeout(100)
        ev(pg, "ui.step=stepsOf(ui.rec).length-1; render()")
        lab = ev(pg, "(document.querySelector('[data-act=done]')||{innerText:''}).innerText")
        check('Done button names the appointment', 'appointment' in lab.lower(), lab)
        ev(pg, "ui.book=newBook({base:{types:['service'],name:'New Cust',date:localISO()}}); ui.view='book'; render()")
        ev(pg, "bkSave(); bkStart()"); pg.wait_for_timeout(200)
        rid = ev(pg, "[(bookings.find(b=>b.name==='New Cust')||{}).recIds||[], ui.rec.id]")
        check('starting forms from an appointment remembers them', rid[0] == [rid[1]], rid)
        t1 = ev(pg, "otwText({name:'Ann Lee',time:'10:30',address:'1 Road\\nLincoln'})"); t2 = ev(pg, "otwText({name:'Ann Lee',time:'10:30',address:''})")
        check('on my way text includes the address', 'appointment at 1 Road, Lincoln.' in t1, t1)
        check('on my way text copes with no address', 'appointment. See you' in t2, t2)
        ev(pg, "bookings.length=0; bookings.push({id:'k1',date:'2026-12-01',time:'10:00',mins:'60',types:['service'],name:'Ann',status:'booked'},{id:'k2',date:'2026-12-01',time:'10:30',mins:'60',types:['service'],name:'Bob',status:'booked'},{id:'k3',date:'2026-12-01',time:'13:00',mins:'60',types:['service'],name:'Cy',status:'booked'}); ui.view='cal'; ui.calMode='month'; ui.cal={m:'2026-12',d:'2026-12-01'}; render()")
        cl = ev(pg, "[...document.querySelectorAll('#view .item[data-act=bookOpen]')].map(e=>e.innerText.toLowerCase().includes('clashes with'))")
        check('appointments that overlap are flagged as a clash', cl == [True, True, False], cl)
        ev(pg, "ui.view='settings'; ui.sTab='app'; render()")
        first = ev(pg, "document.querySelector('[data-stab=app] h2').innerText.toLowerCase()")
        check('Settings > App & account starts with the Account box', 'account' in first, first)
        ev(pg, "ui.view='prices'; ui.pCat='Labour'; render()")
        sp = ev(pg, "(()=>{const it=settings.qList.find(x=>x.type==='Labour'); it.supplier='Plumbase\\n01522 000000'; const r=QUO.rowsFromItems([it]); const back=QUO.itemsFromRows(r)[0]; return [r[0][r[0].length-1], r[1][r[1].length-1], back.supplier]})()")
        check('supplier details go out to and come back from the spreadsheet', sp == ['Supplier', 'Plumbase\n01522 000000', 'Plumbase\n01522 000000'], sp)
        ev(pg, "ui.pEdit=settings.qList.find(x=>x.type==='Labour').id; render()")
        check('item editor has a supplier box', ev(pg, "!!document.querySelector('[data-pi=supplier]')"))
        check('no page errors scheduling a quote', not errs, errs)
        ctx.close()

        # ---------- 12s. settings cog in the header ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.view='home'; render()")
        tabs = ev(pg, "[...document.querySelectorAll('.tabs button')].map(b=>b.innerText).join(',')")
        pg.click('#setBtn'); pg.wait_for_timeout(200)
        check('settings is a cog in the header and gone from the bottom bar', 'Settings' not in tabs and ev(pg, "ui.view") == 'settings' and ev(pg, "document.querySelector('#setBtn').classList.contains('on')"), tabs)
        ev(pg, "ui.pick={types:{gas:true},customer:null}; startJob()")
        pg.click('#setBtn'); pg.wait_for_timeout(200)
        check('opening settings from inside a form keeps it as a draft', ev(pg, "ui.view") == 'settings' and ev(pg, "records.some(r=>r.status==='draft')"))
        check('no page errors with the settings cog', not errs, errs)
        ctx.close()

        # ---------- 12v. oil forms and the work type setting ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "settings.oftecReg='R12345'; saveSettings()")
        check('gas is the default work type: oil forms hidden', ev(pg, "workType()==='gas' && !recOn('oil') && !recOn('oilcomp') && recOn('gas')"))
        ev(pg, "settings.workType='oil'; saveSettings()")
        check('oil work type hides gas forms and gas tools', ev(pg, "recOn('oil') && recOn('oillord') && !recOn('gas') && !recOn('service') && !toolOn('gas') && !toolOn('pipe') && toolOn('heat')"))
        ev(pg, "settings.workType='both'; saveSettings()")
        check('gas and oil shows both', ev(pg, "recOn('gas') && recOn('oil') && recOn('oiltank') && OFORM.TYPES.every(recOn)"))
        # every oil form: opens, every step draws, validation lists missing items, a filled one makes a PDF
        res = ev(pg, """(async()=>{
          const out={}, cust={id:'c9',name:'Mr Oil Test',phone:'07000',email:'o@t.co',billing:''};
          const sig='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
          for (const t of ['oil','oiltank',...OFORM.TYPES]) {
            const r=newRecord(cust,t); r.jobAddress='1 Tank Lane, Lincoln, LN1 1AA';
            ui.rec=r; ui.view='form'; const n=stepsOf(r).length; let drew=0;
            for (let s=0;s<n;s++){ ui.step=s; try{ render(); if(document.querySelector('#view').innerText.length>20) drew++; }catch(e){ out[t+'_err']=String(e); } }
            const missing=validate(r).length;
            r.engineerSig=sig; r.customerPresent='No';
            if (OFORM.of(r)) OFORM.of(r).sections.forEach(sec=>sec.fields.forEach(fd=>{ let v=''; if(fd.t==='pick')v=fd.o[0]; else if(['yn','ynna'].includes(fd.t))v='YES'; else if(fd.t==='pfn')v='PASS'; else if(fd.t==='num')v='2'; else if(fd.t==='date')v='2027-10-01'; else if(fd.t==='area'||fd.t==='txt')v='x'; else return; if(fd.top) r[fd.k]=v; else r.f[fd.k]=v; }));
            else if (t==='oil') { Object.assign(r,{location:'Kitchen',make:'Grant',model:'M',systemType:'Combi',serial:'S',fuel:'Kerosene (28 sec)',flue:'Conventional flue (chimney / liner)',reason:'Service',stripDown:'Yes',age:'5',nozzleSize:'0.6',pumpPressure:'10',filterChanged:'YES',fgDone:'N/A',manufacturer:'YES',safe:'YES',defectClass:'None',renewal:'2027-10-01'}); OIL.ALL.forEach(c=>r.chk[c.k]='PASS'); }
            else { Object.assign(r,{position:'Outside, on the ground',material:'Plastic',bunded:'YES',capacity:'1000',fuel:'Kerosene (28 sec)',distBuilding:'3',distBoundary:'2',fireProt:'N/A',nearWater:'NO',waterTest:'No water found',safe:'YES',risk:'Low',defectClass:'None',renewal:'2027-10-01'}); TANK.CHK.forEach(c=>r.chk[c.k]='PASS'); }
            const left=validate(r).map(x=>x.path);
            let pdf=0; try{ const bl=await buildPdf(r,settings); pdf=bl.size; }catch(e){ out[t+'_pdf']=String(e); }
            out[t]={n,drew,missing,left,pdf,name:formName(r)};
          }
          return out; })()""")
        for t in ['oil', 'oiltank', 'oilcomp', 'oillord', 'oilwarn', 'oilrisk', 'oilcond']:
            o = res.get(t) or {}
            check(f'oil form {t}: every step draws', o.get('drew') == o.get('n') and not res.get(t + '_err'), res.get(t + '_err'))
            check(f'oil form {t}: blank form lists what is missing, filled form is complete', o.get('missing', 0) > 5 and o.get('left') == [], o)
            check(f'oil form {t}: PDF builds', o.get('pdf', 0) > 3000, res.get(t + '_pdf'))
        check('oil forms: failed check needs fault details and marks the landlord check unsafe', ev(pg, """(()=>{ const r=newRecord({id:'c8',name:'A B'}, 'oillord'); r.f.leaks='FAIL'; const v=validate(r).map(x=>x.path); r.f.safe='NO'; return v.includes('f.leaks_d') && OFORM.stamp(r) && OFORM.failCount(r)===1; })()"""))
        check('oil forms: warning notice stamps when immediately dangerous', ev(pg, "(()=>{ const r=newRecord({id:'c8',name:'A B'}, 'oilwarn'); r.f.cls='Immediately dangerous'; return OFORM.stamp(r); })()"))
        check('oil forms: Mr Smith greeting still used', ev(pg, "greetName('Mr John Smith')==='Mr Smith'"))
        # settings page shows the work type and OFTEC number
        ev(pg, "ui.view='settings'; ui.sTab='app'; render()")
        check('settings has the work type choice', ev(pg, "!!document.querySelector('[data-s=workType]')"))
        ev(pg, "ui.sTab='business'; render()")
        check('settings has the OFTEC number when oil is on', ev(pg, "!!document.querySelector('[data-s=oftecReg]')"))
        check('no page errors with the oil forms', not errs, errs)
        ctx.close()

        # ---------- 12w. oil tools ----------
        ctx, pg, errs = fresh(b)
        check('gas work type hides the oil tools', ev(pg, "OT_IDS.every(k=>!toolOn(k)) && toolOn('gas')"))
        ev(pg, "settings.workType='oil'; saveSettings()")
        check('oil work type shows all six oil tools', ev(pg, "OT_IDS.length===6 && OT_IDS.every(toolOn)"))
        ev(pg, "settings.toolFire='off'; saveSettings()")
        check('an oil tool can be switched off in settings', ev(pg, "!toolOn('fire') && toolOn('tank')"))
        ev(pg, "settings.toolFire='on'; saveSettings(); ui.view='tools'; ui.tool='menu'; render()")
        check('tools menu lists the oil tools', ev(pg, "['Tank volume','Burner firing','Combustion efficiency','Fuel use','Oil supply pipe','Ventilation sizing'].every(t=>document.querySelector('#view').innerText.toLowerCase().includes(t.toLowerCase()))"))
        calc = ev(pg, """(()=>{ const o=otS(), r={};
          Object.assign(o.tank,{shape:'rect',l:'2000',w:'1000',h:'1000',bl:'2400',bw:'1400',bh:'800'}); let c=otTank(); r.tank=[Math.round(c.L),Math.round(c.need),Math.round(c.B),c.ok];
          o.tank.bl='1800'; r.tankBad=otTank().ok;
          Object.assign(o.tank,{shape:'cyl',orient:'h',d:'1000',l:'2000',bund:''}); r.cyl=Math.round(otTank().L);
          Object.assign(o.fire,{nozzle:'0.60',p:'10',unit:'bar',fuel:'kero',cv:''}); c=otFire(); r.fire=[+c.lh.toFixed(2),+c.gross.toFixed(1)];
          o.fire.unit='psi'; o.fire.p='100'; r.psi=+otFire().lh.toFixed(2);
          Object.assign(o.eff,{co2:'11.5',tf:'180',ta:'20'}); r.eff=+otEff().net.toFixed(1);
          Object.assign(o.fuel,{kw:'20',hrs:'1000',old:'70',neu:'90',price:'60',fuel:'kero',cv:''}); c=otFuel(); r.fuel=[Math.round(c.lOld),Math.round(c.lNew),Math.round(c.cOld)];
          Object.assign(o.vent,{kw:'24',flue:'open',stab:'no'}); r.vent=Math.round(otVent().area); o.vent.stab='yes'; r.ventStab=Math.round(otVent().area); o.vent.flue='sealed'; r.sealed=!!otVent().sealed;
          Object.assign(o.opipe,{sys:'single',pos:'above',ht:'0.5',kw:'24',len:'15',fuel:'kero'}); c=otPipe(); r.pipe=c.best&&c.best.n; o.opipe.len='100000'; r.pipeNone=!otPipe().best;
          return r; })()""")
        check('oil tools: tank volume and bund (rectangular, cylinder, too small)', calc['tank'] == [2000, 2200, 2688, True] and calc['tankBad'] is False and calc['cyl'] == 1571, calc)
        check('oil tools: firing rate (nozzle 0.60 at 10 bar, psi unit)', calc['fire'] == [2.74, 28.2] and calc['psi'] == 2.27, calc)
        check('oil tools: combustion efficiency (Siegert)', calc['eff'] == 89.4, calc)
        check('oil tools: fuel use and cost', calc['fuel'] == [2774, 2157, 1664], calc)
        check('oil tools: ventilation sizing', calc['vent'] == 10450 and calc['ventStab'] == 17650 and calc['sealed'], calc)
        check('oil tools: pipe sizing gives a size, and none when far too long', calc['pipe'] == '8 mm' and calc['pipeNone'], calc)
        ui_ok = ev(pg, """(()=>{ let ok=true; for (const k of OT_IDS){ ui.view='tools'; ui.tool=k; TL.work=true; try{ render(); if(!document.getElementById('tlOtRes')) ok=false; }catch(e){ ok=false; } } TL.work=false; return ok; })()""")
        check('oil tools: every tool screen draws with workings on', ui_ok)
        ev(pg, "TL.used.otank=1; TL.used.ofire=1; TL.used.oeff=1; TL.used.ofuel=1; TL.used.opipe=1; TL.used.ovent=1")
        check('oil tools: results go into the tools report', ev(pg, "otSections().length>=5 && tlSections().some(x=>x.id==='ofire')"))
        check('no page errors with the oil tools', not errs, errs)
        ctx.close()

        # ---------- 12x. PDF maker loads after the first screen ----------
        ctx, pg, errs = fresh(b)
        check('PDF maker is not in the first load, and loads on demand', ev(pg, "typeof ombPdfLoad==='function'") and ev(pg, "(async()=>{ const was=typeof window.jspdf; const r=newRecord({id:'c1',name:'A B'},'gas'); try{ await buildPdf(r,settings); }catch(e){} return was==='undefined'||was==='object'; })()") and ev(pg, "(async()=>{ await ombPdfLoad(); return typeof window.jspdf==='object' && typeof buildOilPdf==='function' && !String(buildOilPdf).includes('ombPdfLoad'); })()"))
        check('no page errors with the lazy PDF maker', not errs, errs)
        ctx.close()

        # ---------- signature pad is not covered by the dashed line ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "(()=>{const c={id:'sg1',name:'Sig Test',phone:'',address:'1 A St\\nLincoln\\nLN1 1AA'};customers.push(c);saveCustomers();const r=newRecord(c,'gas');ui.rec=r;ui.step=6;ui.pdfs={};ui.view='form';render();})()")
        sg = ev(pg, "(()=>{const l=document.querySelector('.sigwrap .sigline');if(!l)return null;const s=getComputedStyle(l);return {bg:s.backgroundColor,h:l.getBoundingClientRect().height,bw:s.borderTopWidth}})()")
        check('signature line is a thin dashed line, not a white box over the signature', sg is not None and sg['h'] <= 2 and sg['bw'] == '0px', sg)
        ctx.close()

        # ---------- defects at the bottom of each appliance ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "(()=>{const c={id:'df1',name:'Def Test',phone:'',address:'1 A St\\nLincoln\\nLN1 1AA'};customers.push(c);saveCustomers();const r=newRecord(c,'gas');ui.rec=r;ui.step=1;ui.appTab=1;r.applianceCount='2';r.appliances.push(blankAppliance());ui.pdfs={};ui.view='form';render();})()")
        pg.click('[data-act=appAddDef]')
        pg.fill('textarea[data-f="defects.0.text"], [data-path="defects.0.text"] textarea', 'Flue joint loose') if False else None
        ev(pg, "setP(ui.rec,'defects.0.text','Flue joint loose');setP(ui.rec,'defects.0.cls','AR');setP(ui.rec,'defects.0.action','Customer advised');render()")
        dd = ev(pg, "({n:ui.rec.defectCount,app:ui.rec.defects[0].app,btn:!!document.querySelector('[data-act=appAddDef]'),h:document.querySelector('#view').innerText.includes('Defects on this appliance')})")
        check('defect added at the bottom of appliance 2 is tagged with that appliance', dd['n'] == '1' and dd['app'] == 1 and dd['h'], dd)
        ev(pg, "ui.step=4;render()")
        check('the Defects step lists it with its appliance', 'Appliance 2' in ev(pg, "document.querySelector('#view').innerText"))
        ev(pg, "ui.rec.defects[0].action='';")
        iss = ev(pg, "validate(ui.rec).filter(x=>/Appliance 2 defect/.test(x.label)).map(x=>x.step+':'+x.app)")
        check('an unfinished appliance defect is flagged on that appliance step', iss and iss[0] == '1:1', iss)
        ev(pg, "ui.step=1;ui.appTab=1;render()"); pg.click('[data-act=appRmDef]')
        check('a defect can be removed from the appliance', ev(pg, "ui.rec.defectCount") == '0' and ev(pg, "ui.rec.defects.length") == 0)
        check('no page errors with appliance defects', not errs, errs)
        ctx.close()

        # ---------- 12y. appliance register ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "(()=>{const c={id:'rc1',name:'Ann Beck',phone:'07700900000',address:'14 Larch Road\\nLincoln\\nLN2 4AB'};customers.push(c);saveCustomers();const r=newRecord(c,'service');r.customerId='rc1';r.jobAddress='14 Larch Road\\nLincoln\\nLN2 4AB';r.make='Worcester';r.model='Greenstar 30i';r.gc='47 311 74';r.serial='7736123456';r.inspectionDate=localISO();r.renewal=new Date(Date.now()+12*864e5).toISOString().slice(0,10);records.push(r);saveRecords();ui.view='custEdit';ui.cust=JSON.parse(JSON.stringify(c));ui.cTab='appl';render();})()")
        txt = ev(pg, "document.querySelector('[data-ctab=appl]').innerText")
        check('register shows make, model, GC and serial', all(x in txt for x in ['Worcester', 'Greenstar 30i', '47 311 74', '7736123456']), txt)
        check('register shows service due tag', 'Due in 12 days' in txt, txt)
        pg.click('[data-act=regStart]')
        got = ev(pg, "({v:ui.view,m:ui.rec&&ui.rec.make,g:ui.rec&&ui.rec.gc,s:ui.rec&&ui.rec.serial,a:ui.rec&&ui.rec.jobAddress})")
        check('register start opens a pre-filled service record', got.get('m') == 'Worcester' and got.get('g') == '47 311 74' and 'Larch' in (got.get('a') or ''), got)
        check('no page errors with the register', not errs, errs)
        ctx.close()

        # ---------- 12z. chase overdue invoices ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "(()=>{const T=localISO();invoices.push({id:'ci1',number:'INV-1',date:addDays(T,-30),due:addDays(T,-9),paid:false,sent:true,customer:{name:'Courtney Cole',email:'c@x.com',phone:'07700900111'},lines:[{d:'x',q:'1',p:'240'}],vatRate:'0',disc:''});saveInvoices();ui.view='invoices';ui.invTab='inv';ui.invFilter='all';render();})()")
        txt = ev(pg, "document.querySelector('#view').innerText")
        check('invoices list shows overdue total, days late and a chase button', '£240' in txt and '9 days late' in txt and ev(pg, "!!document.querySelector('[data-act=chaseAll]')"), txt[:200])
        pg.click('[data-act=chaseAll]')
        check('chase sheet offers Text, WhatsApp, Email and Mark as paid', all(ev(pg, f"!!document.querySelector('#chaseSheet [data-how={h}]')") for h in ['sms', 'wa', 'mail', 'paid']))
        ev(pg, "document.addEventListener('click',e=>{const a=e.target.closest('a[href^=\"sms:\"]');if(a){window.__sms=a.getAttribute('href');e.preventDefault();}},true)")
        pg.click('#chaseSheet [data-how=sms]')
        got = ev(pg, "({n:invoices[0].chases,r:invoices[0].remindedAt,s:window.__sms||''})")
        check('Text chase records the chase and opens a message', got['n'] == 1 and got['r'] and got['s'].startswith('sms:07700900111'), got)
        check('chased invoice shows chased count', 'chased 1' in ev(pg, "document.querySelector('#view').innerText"))
        ev(pg, "showChase('ci1')"); pg.click('#chaseSheet [data-how=paid]')
        check('Mark as paid from the chase sheet', ev(pg, "invoices[0].paid===true"))
        check('no page errors with chasing', not errs, errs)
        ctx.close()

        # ---------- 12zz. accepted quote -> invoice ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "(()=>{const c={id:'qc1',name:'Dan Cole',phone:'07700900222',email:'d@x.com',billing:'2 High St',properties:['6 Elm Rd\\nLincoln\\nLN6 7QD']};customers.push(c);saveCustomers();const q=newRecord(c,'quote');q.customerId='qc1';q.jobAddress='6 Elm Rd\\nLincoln\\nLN6 7QD';q.make='Worcester';q.model='30i';q.boilerPrice='2240';q.fluePrice='220';q.labourPrice='180';q.labourQty='1';q.lines=[{name:'Magnetic filter',qty:'1',price:'180'}];q.status='complete';q.qStatus='accepted';q.qDate=localISO();records.push(q);saveRecords();ui.view='invoices';ui.invTab='quotes';render();})()")
        check('accepted quote offers Create invoice', ev(pg, "!!document.querySelector('[data-act=quoInvoice]')"))
        pg.click('[data-act=quoInvoice]')
        inv = ev(pg, "({v:ui.view,n:(ui.inv||{}).lines&&ui.inv.lines.length,sum:ui.inv&&ui.inv.lines.reduce((a,l)=>a+l.q*l.p,0),cust:ui.inv&&ui.inv.customer.name,addr:ui.inv&&ui.inv.jobAddress,linked:records.find(r=>r.type==='quote').qInv===(ui.inv||{}).id})")
        check('quote becomes an invoice with the same lines, customer and address', inv['v'] == 'invEdit' and inv['n'] == 4 and inv['sum'] == 2820 and inv['cust'] == 'Dan Cole' and 'Elm' in inv['addr'] and inv['linked'], inv)
        ev(pg, "ui.view='invoices';ui.invTab='quotes';render()")
        check('quote then shows Open invoice, not a second one', ev(pg, "!document.querySelector('[data-act=quoInvoice]') && !!document.querySelector('[data-act=openInv]')") and ev(pg, "invoices.length") == 1)
        ev(pg, "ui.view='invoices';ui.invTab='quotes';render()")
        pg.click('[data-act=quoBook]'); pg.click('[data-act=bookSave]')
        ev(pg, "ui.view='invoices';ui.invTab='quotes';render()")
        check('quote shows booked once an appointment exists', 'Booked in for' in ev(pg, "document.querySelector('#view').innerText") and not ev(pg, "!!document.querySelector('[data-act=quoBook]')"))
        ev(pg, "ui.book={...bookings[0]};ui.bookFrom='cal';ui.view='book';render()")
        pg.evaluate("document.querySelectorAll('details.more').forEach(d=>d.open=true)"); pg.click('[data-act=bookDel]')
        ev(pg, "ui.view='invoices';ui.invTab='quotes';render()")
        check('deleting the appointment frees the quote to be booked again', ev(pg, "!!document.querySelector('[data-act=quoBook]')") and not ev(pg, "records.find(r=>r.type==='quote').qBooked"))
        ev(pg, "ui.view='invoices';ui.invTab='quotes';render()")
        pg.click('[data-act=quoBook]'); pg.click('[data-act=bookSave]')
        n0 = ev(pg, "bookings.length")
        ev(pg, "(()=>{const q=records.find(r=>r.type==='quote');const bt=document.createElement('button');bt.id='tmpOut';bt.dataset.act='qOutcome';bt.dataset.id=q.id;bt.dataset.v='declined';document.body.appendChild(bt);})()")
        pg.click('#tmpOut')
        check('declining a booked quote offers to remove it from the calendar', n0 == 1 and ev(pg, "bookings.length") == 0 and ev(pg, "records.find(r=>r.type==='quote').qStatus") == 'declined' and not ev(pg, "records.find(r=>r.type==='quote').qBooked"), [n0, ev(pg, "bookings.length")])
        check('no page errors with quote to invoice', not errs, errs)
        ctx.close()

        # ---------- 12zy. route for the day ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "(()=>{settings.calOn='on';saveSettings();const T=localISO();[['09:00','Ann Beck','14 Larch Road\\nLincoln\\nLN2 4AB'],['11:30','Dan Cole','6 Elm Rd\\nLincoln\\nLN6 7QD'],['14:00','Oakfield','1 Oak St\\nLincoln\\nLN1 3XY']].forEach((x,k)=>bookings.push({id:'rb'+k,date:T,time:x[0],mins:60,name:x[1],address:x[2],types:['service'],status:'booked',phone:'',email:''}));saveBookings&&saveBookings();ui.view='home';render();})()")
        check('Today shows a Route button with 3 stops', '3 stops' in ev(pg, "document.querySelector('#view').innerText"))
        pg.click('[data-act=routeOpen]')
        hrefs = ev(pg, "[...document.querySelectorAll('#routeSheet a.btn')].map(a=>a.href)")
        check('route sheet has a Go link per stop and a Start route link', len(hrefs) == 4 and 'waypoints=' in hrefs[-1] and 'Oak' in hrefs[-1], hrefs)
        ev(pg, "bookings.push({id:'rt1',date:addDays(localISO(),1),time:'09:00',mins:60,name:'Mrs Jo Hale',address:'3 Mill Ln\\nLincoln\\nLN1 1AA',types:['service'],status:'booked',phone:'07700900333',email:''},{id:'rt2',date:addDays(localISO(),1),time:'14:30',mins:60,name:'Tom Smith',address:'9 Fen Rd\\nLincoln\\nLN2 2BB',types:['service'],status:'booked',phone:'07700900444',email:''});saveBookings();ui.view='home';render();")
        ev(pg, "localStorage.setItem('omb_noinstall','true');document.querySelector('#routeSheet').remove();document.querySelector('#instPop')&&document.querySelector('#instPop').remove()"); pg.click('#view [data-act=routeOpen][data-day="1"]')
        eta = ev(pg, "[etaText(bookings.find(b=>b.id==='rt1'),1),etaText(bookings.find(b=>b.id==='rt2'),1),document.querySelectorAll('#routeSheet [data-act=etaText]').length]")
        check('tomorrow route lists jobs with ETA text from the booked time', eta[2] == 2 and 'around 9am tomorrow' in eta[0] and 'around 2:30pm tomorrow' in eta[1] and 'Mrs Hale' in eta[0].replace('Jo ', ''), eta)
        ev(pg, "CLOUD.signedIn=()=>true;CLOUD.post=async()=>({legs:[{mins:12,miles:5.1},{mins:26,miles:11.8}]});document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(0)")
        pg.wait_for_timeout(400)
        rt = ev(pg, "document.querySelector('#routeSheet').innerText")
        ev(pg, "bookings.push({id:'rt9',date:localISO(),time:'23:00',mins:60,name:'No Pc',address:'2A ASHFIELD',types:['service'],status:'booked',phone:'',email:''});saveBookings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(0)")
        pg.wait_for_timeout(400)
        rt2 = ev(pg, "document.querySelector('#routeSheet').innerText")
        check('addresses with no postcode are left out of drive times and flagged', 'add a postcode for accurate times' in rt2 and 'No Pc' in rt2, rt2)
        pg.click('#routeSheet [data-act=routeFixPc]')
        pg.wait_for_timeout(300)
        fx = ev(pg, "({v:ui.view,f:document.activeElement&&document.activeElement.getAttribute('data-bk'),val:document.activeElement&&document.activeElement.value})")
        check('tapping the name opens the booking with the cursor in the postcode box', fx['v'] == 'book' and fx['f'] == 'addrpc', fx)
        pg.fill('input[data-bk=addrpc]', 'dn21 2pd'); pg.fill('textarea[data-bk=address]', '2A Ashfield\nGainsborough')
        bk = ev(pg, "({a:ui.book.address,pc:document.querySelector('input[data-bk=addrpc]').value,ta:document.querySelector('textarea[data-bk=address]').value})")
        check('appointment address and postcode are saved together', bk['a'] == '2A Ashfield\nGainsborough\nDN21 2PD' and bk['pc'] == 'DN21 2PD', bk)
        ev(pg, "ui.view='home';render()")
        ev(pg, "bookings=bookings.filter(b=>b.id!=='rt9');saveBookings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(0)"); pg.wait_for_timeout(400)
        ev(pg, "window.__saveBk=JSON.stringify(bookings);bookings=bookings.filter(b=>b.date!==localISO());var d=new Date(Date.now()+40*60000);window.__tm=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);bookings.push({id:'rh1',date:localISO(),time:window.__tm,mins:60,name:'Here Test',address:'1 High St\\nLincoln\\nLN1 1AA',types:['service'],status:'booked',phone:'07700900555',email:''},{id:'rh2',date:localISO(),time:'23:59',mins:60,name:'Later',address:'2 High St\\nLincoln\\nLN1 1AB',types:['service'],status:'booked',phone:'',email:''});saveBookings()")
        def here(mins, lat):
            ev(pg, "navigator.geolocation.getCurrentPosition=(ok)=>ok({coords:{latitude:%s,longitude:-0.54}});CLOUD.signedIn=()=>true;CLOUD.post=async(n,b)=>({legs:[{mins:%d,miles:9.3}]});hereMem.t=0;document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(0)" % (lat, mins))
            pg.wait_for_timeout(600)
            return ev(pg, "({t:(document.querySelector('#routeHere')||{}).innerText,c:(document.querySelector('#routeHere')||{dataset:{}}).dataset.arrive})")
        r1 = here(21, 53.23)
        check('route sheet shows the drive from here to the first job, green when early', r1['t'] and 'From here to the first job' in r1['t'] and '21 min' in r1['t'] and r1['c'] == 'green', r1)
        tt = ev(pg, "(document.getElementById('routeTot')||{}).innerText")
        check('route total includes the drive from here to the first job', tt and 'about 42 mins' in tt and 'including 21 mins from here' in tt, tt)
        ev(pg, "ui.view='home';render()"); pg.wait_for_timeout(700)
        so = ev(pg, "({d:(document.getElementById('nextDrive')||{}).innerText,s:(document.getElementById('nextSetOff')||{}).innerText})")
        check('next job says when to set off to arrive on time', so['s'] and 'Set off in' in so['s'] and 'to arrive on time' in so['s'], so)
        otw = ev(pg, "otwText(bookings.find(b=>b.id==='rh1'))")
        check('on my way text adds the travel time', 'about 21 minutes' in otw and 'sorry' not in otw, otw)
        r2 = here(50, 53.31)
        check('amber when up to 15 minutes late', r2['c'] == 'amber' and 'mins late' in r2['t'], r2)
        otw2 = ev(pg, "otwText(bookings.find(b=>b.id==='rh1'))")
        check('late on my way text says sorry', 'about 50 minutes' in otw2 and 'running behind schedule' in otw2, otw2)
        r3 = here(75, 53.41)
        check('red when over 15 minutes late', r3['c'] == 'red', r3)
        ev(pg, "settings.calOtwEta='off';saveSettings()")
        otw3 = ev(pg, "otwText(bookings.find(b=>b.id==='rh1'))")
        check('travel time in the text can be switched off', 'minutes' not in otw3 and 'See you shortly' in otw3, otw3)
        ev(pg, "settings.calOtwEta='on';saveSettings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();bookings=JSON.parse(window.__saveBk);saveBookings()")
        ev(pg, "settings.address='1 Test Road\\nLincoln\\nLN1 2BN';saveSettings();bookings.forEach(b=>{b.time=b.time||'09:00'});CLOUD.post=async()=>({legs:[{mins:18,miles:15.2}]});ui.view='home';render();")
        pg.wait_for_timeout(500)
        ev(pg, "navigator.geolocation.getCurrentPosition=(ok)=>ok({coords:{latitude:53.23,longitude:-0.54}});CLOUD.post=async(n,b)=>{window.__body=b;return {legs:[{mins:9,miles:4.2}]}};hereMem.t=0;ui.view='home';render();")
        pg.wait_for_timeout(500)
        gp = ev(pg, "({t:(document.querySelector('#nextDrive')||{}).innerText,b:JSON.stringify(window.__body)})")
        check('next job uses the phone location when allowed', 'from here' in (gp['t'] or '') and '"from"' in gp['b'], gp)
        ev(pg, "settings.gpsDrive='off';saveSettings();Object.keys(pairMem).forEach(k=>delete pairMem[k]);hereMem.t=0;CLOUD.post=async()=>({legs:[{mins:18,miles:15.2}]});localStorage.clear&&Object.keys(localStorage).filter(k=>k.startsWith('omb_drv_')).forEach(k=>localStorage.removeItem(k));ui.view='home';render();")
        pg.wait_for_timeout(500)
        check('next job shows the drive time to it', 'About 18 mins drive' in ev(pg, "document.querySelector('#view').innerText"), ev(pg, "JSON.stringify({el:!!document.querySelector('#nextDrive'),t:(document.querySelector('#nextDrive')||{}).innerText,nx:(typeof todayNext==='function'&&todayNext(nextBookings())||{}).address,s:settings.address})"))
        ev(pg, "Object.keys(pairMem).forEach(k=>delete pairMem[k]);Object.keys(localStorage).filter(k=>k.startsWith('omb_drv_')).forEach(k=>localStorage.removeItem(k));CLOUD.post=async()=>{throw Object.assign(new Error('Daily limit reached. Try again tomorrow.'),{status:429})};ui.view='home';render();")
        pg.wait_for_timeout(500)
        check('a failed drive time says why instead of showing nothing', 'Drive time not available: Daily limit reached' in (ev(pg, "(document.querySelector('#nextDrive')||{}).innerText") or ''), ev(pg, "(document.querySelector('#nextDrive')||{}).innerText"))
        ev(pg, "Object.keys(pairMem).forEach(k=>delete pairMem[k]);Object.keys(localStorage).filter(k=>k.startsWith('omb_drv_')).forEach(k=>localStorage.removeItem(k));CLOUD.post=async()=>{throw Object.assign(new Error('Google could not work out the route'),{status:502})};ui.view='home';render();")
        pg.wait_for_timeout(500)
        check('a Google route failure is explained', 'Google could not work out that route' in (ev(pg, "(document.querySelector('#nextDrive')||{}).innerText") or ''), ev(pg, "(document.querySelector('#nextDrive')||{}).innerText"))
        ev(pg, "Object.keys(pairMem).forEach(k=>delete pairMem[k]);Object.keys(localStorage).filter(k=>k.startsWith('omb_drv_')).forEach(k=>localStorage.removeItem(k));CLOUD.post=async()=>{throw Object.assign(new Error('Subscription needed'),{status:402})};ui.view='home';render();")
        pg.wait_for_timeout(500)
        check('a refused drive time request shows no confusing trial message', 'trial' not in (ev(pg, "(document.querySelector('#nextDrive')||{}).innerText") or '').lower() and 'subscription' not in (ev(pg, "(document.querySelector('#nextDrive')||{}).innerText") or '').lower(), ev(pg, "(document.querySelector('#nextDrive')||{}).innerText"))
        ev(pg, "CLOUD.post=async()=>({legs:[{mins:18,miles:15.2}]});Object.keys(pairMem).forEach(k=>delete pairMem[k]);Object.keys(localStorage).filter(k=>k.startsWith('omb_drv_')).forEach(k=>localStorage.removeItem(k));ui.view='home';render();")
        pg.wait_for_timeout(300)
        check('route works out drive times by itself when opened', 'about 12 min' in rt and 'about 26 min' in rt and 'about 50 min' in rt and 'From your base' in rt, rt)
        ev(pg, "settings.address='1 Test Road\\nLincoln\\nLN1 2BN';saveSettings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(600)
        tm = ev(pg, "(document.getElementById('routeHere')||{}).innerText")
        check('tomorrow route starts from the Settings postcode and says when to leave', tm and 'From your base (LN1 2BN)' in tm and 'Leave by 08:42 to be there for 09:00' in tm, tm)
        ev(pg, "settings.address='1 Test Road\\nLincoln\\nLN1 2BN';settings.routeStart='';saveSettings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();ui.view='settings';ui.sTab='calendar';render();document.querySelector('[data-act=routeStartCopy]').scrollIntoView()")
        pg.click('[data-act=routeStartCopy]')
        check('start postcode can be copied from the business address', ev(pg, "settings.routeStart") == 'LN1 2BN', ev(pg, "settings.routeStart"))
        ev(pg, "settings.routeStart='dn21 2pd';saveSettings();CLOUD.post=async(n,b)=>{window.__b=JSON.stringify(b);return {legs:[{mins:30,miles:12}]}};document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(600)
        tm2 = ev(pg, "(document.getElementById('routeHere')||{}).innerText+' '+window.__b")
        check('route uses the start postcode instead of the business address', 'From your base (DN21 2PD)' in tm2 and 'DN21 2PD, UK' in tm2, tm2)
        ev(pg, "document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();bookings=bookings.filter(b=>b.id!=='rl1');var d=new Date(Date.now()-30*60000);window.__lt=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);bookings.push({id:'rl1',date:localISO(),time:window.__lt,mins:60,name:'Late Test',address:'1 A St\\nLincoln\\nLN1 1AA',types:['service'],status:'booked',phone:'07700900888',email:''});saveBookings();ui.book={...bookings.find(b=>b.id==='rl1'),types:['service']};ui.view='book';render()")
        check('late appointment shows a Reschedule button', ev(pg, "!!document.querySelector('[data-act=bookResched]')"))
        pg.click('[data-act=bookResched]')
        pg.fill('#rsDate', ev(pg, "addDays(localISO(),1)")); pg.fill('#rsTime', '10:30')
        pg.click('[data-act=reschedSave]')
        mv = ev(pg, "({d:bookings.find(b=>b.id==='rl1').date,t:bookings.find(b=>b.id==='rl1').time,t0:addDays(localISO(),1)})")
        check('reschedule moves the appointment', mv['d'] == mv['t0'] and mv['t'] == '10:30', mv)
        ev(pg, "ui.book={...bookings.find(b=>b.id==='rl1'),types:['service']};render()")
        check('no Reschedule button once it is not late', not ev(pg, "!!document.querySelector('[data-act=bookResched]')"))
        ev(pg, "bookings=bookings.filter(b=>b.id!=='rl1');saveBookings();ui.book=null;ui.view='home';render()")
        ev(pg, "document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();bookings=bookings.filter(b=>b.date!==addDays(localISO(),1));var D=addDays(localISO(),1);bookings.push({id:'o1',date:D,time:'09:00',mins:60,name:'First Ann',address:'1 A St\\nLincoln\\nLN1 1AA',types:['service'],status:'booked',phone:'',email:''},{id:'o2',date:D,time:'11:00',mins:60,name:'Second Bob',address:'2 B St\\nLincoln\\nLN1 1AB',types:['service'],status:'booked',phone:'',email:''},{id:'o3',date:D,time:'9:30',mins:60,name:'Middle Cat',address:'3 C St\\nLincoln\\nLN1 1AC',types:['service'],status:'booked',phone:'',email:''});saveBookings();showRoute(1)"); pg.wait_for_timeout(500)
        o1 = ev(pg, "[...document.querySelectorAll('#routeSheet .line .main b')].map(e=>e.innerText.replace(/^[\\d:]+ /,''))")
        ev(pg, "ui.book={...bookings.find(b=>b.id==='o1'),types:['service']};ui.book.time='13:00';bkSave();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(500)
        o2 = ev(pg, "[...document.querySelectorAll('#routeSheet .line .main b')].map(e=>e.innerText.replace(/^[\\d:]+ /,''))")
        check('route is in appointment order and follows a changed time', o1 == ['First Ann', 'Middle Cat', 'Second Bob'] and o2 == ['Middle Cat', 'Second Bob', 'First Ann'], [o1, o2])
        ev(pg, "document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();bookings=bookings.filter(b=>!['o1','o2','o3'].includes(b.id));saveBookings()")
        ev(pg, "bookings.push({id:'oj1',date:addDays(localISO(),1),time:'08:00',mins:60,name:'Open Me',address:'9 Z St\\nLincoln\\nLN1 1AZ',types:['service'],status:'booked',phone:'',email:''});saveBookings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(400)
        pg.click('#routeSheet [data-act=routeJob][data-id=oj1]')
        oj = ev(pg, "({v:ui.view,id:ui.book&&ui.book.id,sheet:!!document.querySelector('#routeSheet')})")
        check('tapping a job in the route opens the appointment', oj['v'] == 'book' and oj['id'] == 'oj1' and not oj['sheet'], oj)
        ev(pg, "bookings=bookings.filter(b=>b.id!=='oj1');saveBookings();ui.book=null;ui.view='home';render()")
        # ---- plan my day ----
        ev(pg, "settings.address='1 Test Road\\nLincoln\\nLN1 2BN';settings.routeStart='';settings.dayStart='09:00';saveSettings();var D=addDays(localISO(),1);bookings=bookings.filter(b=>b.date!==D);const mk=(id,t,n,pc)=>({id,date:D,time:t,mins:60,name:n,address:'1 St\\nLincoln\\n'+pc,types:['service'],status:'booked',phone:'07700900'+id.slice(-3).padStart(3,'1'),email:''});bookings.push(mk('pl_a','08:00','Far Ann','LN9 9AA'),mk('pl_b','16:00','Near Bob','LN1 1AB'),mk('pl_c','12:00','Mid Cat','LN5 5AC'));saveBookings();CLOUD.signedIn=()=>true;const M={'LN9 9AA':30,'LN1 1AB':10,'LN5 5AC':20};CLOUD.post=async(n,b)=>{const [f,t]=b.stops;return {legs:[{mins:f.startsWith('LN1 2BN')?M[t.split(',')[0]]:12,miles:5}]}};document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(500)
        pg.click('[data-act=planDay]'); pg.wait_for_timeout(900)
        pv = ev(pg, "window.__plan.rows.map(r=>r.b.name+' '+Math.floor(r.start/60)+':'+('0'+r.start%60).slice(-2)).join('|')")
        check('plan my day: nearest first, hour slots plus drive, rounded up to 5', pv == 'Near Bob 9:00|Mid Cat 10:15|Far Ann 11:30', pv)
        pg.click('[data-act=planApply]'); pg.wait_for_timeout(500)
        ap = ev(pg, "['pl_b','pl_c','pl_a'].map(i=>bookings.find(b=>b.id===i).time).join(' ')")
        check('plan my day applies the times to the calendar', ap == '09:00 10:15 11:30', ap)
        ev(pg, "bookings.forEach(b=>{if(b.id.startsWith('pl_'))b.auto=false});settings.planOrder='far';saveSettings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(400)
        pg.click('[data-act=planDay]'); pg.wait_for_timeout(900)
        pvf = ev(pg, "window.__plan.rows.map(r=>r.b.name).join('|')")
        check('plan my day can put the furthest job first', pvf == 'Far Ann|Mid Cat|Near Bob', pvf)
        pg.click('[data-act=planClose]'); ev(pg, "settings.planOrder='near';saveSettings()")
        ev(pg, "bookings.find(b=>b.id==='pl_c').auto=true;bookings.find(b=>b.id==='pl_a').auto=true;bookings.find(b=>b.id==='pl_c').time='08:00';bookings.find(b=>b.id==='pl_a').time='08:30';bookings.find(b=>b.id==='pl_b').time='10:00';saveBookings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(400)
        pg.click('[data-act=planDay]'); pg.wait_for_timeout(900)
        pv2 = ev(pg, "window.__plan.rows.map(r=>r.b.name+' '+Math.floor(r.start/60)+':'+('0'+r.start%60).slice(-2)).join('|')")
        check('plan my day keeps a fixed job and fits ticked jobs around it', pv2 == 'Mid Cat 9:00|Far Ann 11:15' and ev(pg, "bookings.find(b=>b.id==='pl_b').time") == '10:00', pv2)
        pg.click('[data-act=planClose]')
        ev(pg, "bookings=bookings.filter(b=>!b.id.startsWith('pl_'));saveBookings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove()")
        ev(pg, "var D2=addDays(localISO(),1);bookings=bookings.filter(b=>b.date!==D2);['QA1 1AA','QA2 2AA','QA3 3AA'].forEach((pc,i)=>bookings.push({id:'qq'+i,date:D2,time:'0'+(8+i)+':00',mins:60,name:'Q'+i,address:'1 St\\n'+pc,types:['service'],status:'booked',phone:'',email:''}));saveBookings();window.__n=0;CLOUD.post=async(n,b)=>{window.__n++;return {legs:b.stops.slice(1).map(()=>({mins:11,miles:4}))}};document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove();showRoute(1)"); pg.wait_for_timeout(700)
        ev(pg, "Object.keys(pairMem).forEach(k=>delete pairMem[k]);window.__n=0"); pg.click('[data-act=planDay]'); pg.wait_for_timeout(900)
        n1 = ev(pg, "window.__n"); pg.click('[data-act=planClose]')
        ev(pg, "window.__n=0"); pg.click('[data-act=planDay]'); pg.wait_for_timeout(900)
        n2 = ev(pg, "window.__n"); pg.click('[data-act=planClose]')
        check('plan uses one lookup per job plus one for all legs, then none when repeated', n1 == 4 and n2 == 0, [n1, n2])
        ev(pg, "bookings=bookings.filter(b=>!b.id.startsWith('qq'));saveBookings();document.querySelector('#routeSheet')&&document.querySelector('#routeSheet').remove()")
        check('no page errors with the route', not errs, errs)
        ctx.close()

        # ---------- 12d. zip backup (folders) and restore ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(async()=>{
          const px='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
          const rec=records.find(x=>typeOf(x)==='gas'); rec.defects=[{photos:['ph_t1','ph_t2'],text:'x'}]; await PH.put('ph_t1',{data:px,w:1,h:1}); await PH.put('ph_t2',{data:px,w:1,h:1});
          rec.engineerSig=PH.sigStore(px); await new Promise(r=>setTimeout(r,200));
          await ZB.load();
          const z1=fflate.unzipSync(await ZB.build('photos',()=>{}));
          const names=Object.keys(z1);
          const z2=fflate.unzipSync(await ZB.build('all',()=>{}));
          const pdfs=Object.keys(z2).filter(n=>n.endsWith('.pdf'));
          return {names, pdfs, cust:customers.length, nrec:records.length}})()""")
        names = r['names']
        check('zip has a Photos folder per customer with readable names', any('/Photos/' in n and 'Defect 1 - photo 1' in n for n in names) and any('/Photos/' in n and 'Defect 1 - photo 2' in n for n in names), names)
        check('zip has the restore data and a read me', 'OMB restore data.json' in names and 'READ ME.txt' in names, names)
        check('zip with PDFs holds certificates and invoices in folders', any('/Certificates/' in n for n in r['pdfs']) and len(r['pdfs']) >= r['nrec'], r['pdfs'])
        r = ev(pg, """(async()=>{
          const zip=await ZB.build('photos',()=>{});
          const f=new File([zip],'b.zip'); const d=await ZB.read(f);
          const sig=records.find(x=>typeOf(x)==='gas').engineerSig.slice(4);
          const out={ph:Object.keys(d.photos).includes('ph_t1'), sig:!!d.photos[sig], data:d.photos.ph_t1.data.startsWith('data:image/jpeg'), nr:d.records.length, bank:JSON.stringify(d.settings).includes('sortCode')};
          const bad=await ZB.read(new File([new Uint8Array([1,2,3,4,5,6,7,8,9])],'x.json')); out.notzip=bad===null;
          return out})()""")
        check('zip backup reads back with photos and signatures', r['ph'] and r['sig'] and r['data'] and r['nr'] > 0 and not r['bank'] and r['notzip'], r)
        r = ev(pg, """(async()=>{
          const zip=await ZB.build('photos',()=>{}); const f=new File([zip],'b.zip');
          const n0=records.length; for (const x of records) await PH.dropAll(PH.allIds(x)); records.length=0; customers.length=0; saveRecords(); saveCustomers();
          await restoreBackup(f); await new Promise(r=>setTimeout(r,300));
          return {rec:records.length>=n0, cust:customers.length>0, ph:!!(await PH.get('ph_t1'))}})()""")
        check('restoring from the zip brings back records, customers and photos', r['rec'] and r['cust'] and r['ph'], r)
        check('settings offers the folder backup and restore accepts zip', ev(pg, "ui.view='settings';render();!!document.querySelector('[data-act=expZip]')&&document.querySelector('#restoreFile').accept.includes('.zip')"))
        check('no page errors in zip backup', not errs, errs)
        ctx.close()

        # ---------- 12e. strip down service question on the service forms ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{const out={};
          for (const t of ['service','oil']) {
            let rec=records.find(x=>typeOf(x)===t); if(!rec){rec=newRecord(null,t);}
            const has=()=>{const o=validate(rec);const l=Array.isArray(o)?o.map(x=>x.path||x):Object.keys(o||{});return l.includes('stripDown')};
            rec.stripDown=''; const a=has(); rec.stripDown='No'; const b=has(); rec.age=''; const c=(()=>{const o=validate(rec);const l=Array.isArray(o)?o.map(x=>x.path||x):Object.keys(o||{});return l.includes('age')})();
            out[t]=[a,b,c];
          } return out})()""")
        check('service forms need the strip down Yes/No and no longer need the boiler age', r['service'] == [True, False, False] and r['oil'] == [True, False, False], r)
        ev(pg, "ui.rec=records.find(x=>typeOf(x)==='service'); ui.step=1; ui.view='form'; render()")
        txt = ev(pg, "document.body.innerText")
        check('service form asks about the full strip down service', 'Has a full strip down service been carried out?' in txt and 'Age of boiler (optional)' in txt)
        check('no page errors for strip down question', not errs, errs)
        ctx.close()

        # ---------- 12f. owner page shows last active ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "ui.view='admin'; ui.admin={rows:[{user_id:'u1',email:'kyle@x.com',created_at:'2026-09-01T10:00:00Z',last_sign_in:'2026-10-05T09:00:00Z',last_active:'2026-10-16T18:30:00Z',confirmed:true,status:'active',comped:false},{user_id:'u2',email:'old@x.com',created_at:'2026-09-02T10:00:00Z',last_sign_in:'2026-09-03T09:00:00Z',confirmed:true,status:'trialing',trial_end:'2030-01-01T00:00:00Z',comped:false}],err:'',fb:[]}; render()")
        txt = ev(pg, "document.body.innerText")
        check('owner page shows last active and last sign-in', 'last active 16/10/2026' in txt.lower() or 'last active 16' in txt.lower(), txt[-400:])
        check('owner page copes with a user that has no activity yet', 'old@x.com' in txt and 'last sign-in' in txt.lower())
        check('no page errors on owner page', not errs, errs)
        ctx.close()

        # ---------- 12g. appliance details copied automatically from last visit ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const prev=records.find(x=>typeOf(x)==='service'&&x.model); const cu=customers.find(c=>c.id===prev.customerId);
          const mk=()=>{const r=newRecord(cu,'service'); r.jobAddress=prev.jobAddress; persistRec(r); return r};
          const a=mk(); const doneOn=autoPrev(a);
          settings.autoCopy='off'; const b=mk(); const doneOff=autoPrev(b); settings.autoCopy='on';
          const c=mk(); c.model='Mine'; const keep=autoPrev(c)||c.model==='Mine';
          return {on:doneOn&&a.model===prev.model&&a.make===prev.make&&a.serial===prev.serial, off:!doneOff&&!b.model, keep, readings:!a.engineerSig}})()""")
        check('appliance details fill in automatically for a repeat address', r['on'], r)
        check('automatic copy can be switched off and never overwrites typed details', r['off'] and r['keep'], r)
        check('no page errors in automatic copy', not errs, errs)
        ctx.close()

        # ---------- 12h. appliance history ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const prev=records.find(x=>typeOf(x)==='service'&&x.model); const cu=customers.find(c=>c.id===prev.customerId);
          const mk=(d,fail)=>{const r=newRecord(cu,'service'); Object.assign(r,{jobAddress:prev.jobAddress,make:prev.make,model:prev.model,inspectionDate:d,status:'complete',bpValue:'20'}); SVC.APP.forEach(c=>r.chk[c.k]='PASS'); SVC.SAFE.forEach(c=>r.chk[c.k]='PASS'); if(fail){r.chk.burner='FAIL'; r.fault.burner='dirty injectors'} persistRec(r); return r};
          prev.inspectionDate='2023-10-01';
          mk('2024-10-01',true); mk('2025-10-01',true); mk('2026-10-01',true);
          const item=registerItems(cu).find(i=>i.t==='service'&&addrKey(i.addr)===addrKey(prev.jobAddress));
          const vs=HIST.visitsFor(item,cu); const rp=HIST.repeats(vs);
          ui.cTab='appl'; ui.cust=JSON.parse(JSON.stringify(cu)); ui.view='custEdit'; render();
          window._hid=item.id; return {n:vs.length, rp:rp.map(p=>[p.label,p.run]), btn:!!document.querySelector('[data-act=apHist]')}})()""")
        check('history finds every visit for the appliance', r['n'] >= 3, r)
        check('history spots a check that failed on the last 3 visits running', any(p[0] == 'Burner / injectors' and p[1] == 3 for p in r['rp']), r)
        pg.evaluate("document.querySelector('[data-act=apHist][data-id=\"'+window._hid+'\"]').click()")
        pg.wait_for_timeout(200)
        txt = ev(pg, "(document.getElementById('histSheet')||{}).innerText||''")
        check('history screen opens from the appliance card with readings and failures', 'visits on record' in txt and 'Burner / injectors' in txt and '20 mbar' in txt and 'dirty injectors' in txt, txt[:300])
        pg.evaluate("document.querySelector('#histSheet [data-act=histClose]').click()")
        check('history screen closes', ev(pg, "!document.getElementById('histSheet')"))
        check('no page errors in appliance history', not errs, errs)
        ctx.close()

        # ---------- 12i. defect follow-up ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const cu=customers[0]; const g=newRecord(cu,'gas'); Object.assign(g,{status:'complete',inspectionDate:addDays(localISO(),-9),jobAddress:'1 Test St, Lincoln',defectCount:'3',defects:[{text:'Gas escape at meter',cls:'ID',action:'Capped'},{text:'Flue loose',cls:'AR',action:'Advised'},{text:'Old paintwork',cls:'NCS',action:''}]}); persistRec(g);
          const o=newRecord(cu,'oil'); Object.assign(o,{status:'complete',inspectionDate:localISO(),defectClass:'At risk',defects:'Leaking oil line'}); persistRec(o);
          const d=newRecord(cu,'gas'); Object.assign(d,{status:'draft',defectCount:'1',defects:[{text:'draft only',cls:'ID',action:''}]}); persistRec(d);
          const it=FU.items(); ui.view='home'; render();
          return {n:it.length, first:it[0].cls, texts:it.map(x=>x.text), banner:!!document.querySelector('[data-act=fuOpen]'), sampleHidden:!it.some(x=>x.r.sample), gid:g.id}})()""")
        check('only at risk and immediately dangerous defects on finished records are listed', r['n'] == 3 and r['first'] == 'Immediately dangerous' and 'Old paintwork' not in r['texts'] and 'draft only' not in r['texts'], r)
        check('Home shows a banner for open safety defects', r['banner'])
        pg.evaluate("document.querySelector('[data-act=fuOpen]').click()")
        pg.wait_for_timeout(200)
        txt = ev(pg, "(document.getElementById('fuSheet')||{}).innerText||''")
        check('follow-up list shows the defect and its age', 'Gas escape at meter' in txt and '9 days ago' in txt, txt[:300])
        r = ev(pg, """(()=>{ const b=document.querySelector('#fuSheet [data-act=fuFixed][data-k=g0]'); b.click(); const g=records.find(x=>x.defects&&x.defects[0]&&x.defects[0].text==='Gas escape at meter'); return {fixed:!!(g.dfRes&&g.dfRes.g0), left:FU.items().length, w:FU.wording(FU.items()[0]).includes('safety issue outstanding')}})()""")
        check('Mark fixed removes it from the list and keeps it on the record', r['fixed'] and r['left'] == 2 and r['w'], r)
        check('no page errors in defect follow-up', not errs, errs)
        ctx.close()

        # ---------- 12j. saved defect wording ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const g=newRecord(customers[0],'gas'); g.defectCount='1'; g.defects=[{text:'',cls:'',action:''}]; persistRec(g); ui.rec=g; ui.step=4; ui.view='form'; render();
          const chips=document.querySelectorAll('[data-act=cfUse]').length;
          document.querySelector('[data-act=cfUse][data-i="0"]').click();
          const a={text:g.defects[0].text, cls:g.defects[0].cls, action:g.defects[0].action};
          g.defects[0].text='Radiator valve leaking'; g.defects[0].cls='AR'; g.defects[0].action='Isolated'; render();
          const hasSave=!!document.querySelector('[data-act=cfSave]'); document.querySelector('[data-act=cfSave]').click();
          const saved=settings.commonFaults&&settings.commonFaults.find(x=>x.t==='Radiator valve leaking');
          const g2=newRecord(customers[0],'gas'); g2.defectCount='1'; g2.defects=[{text:'',cls:'',action:''}]; persistRec(g2); ui.rec=g2; render();
          const idx=settings.commonFaults.findIndex(x=>x.t==='Radiator valve leaking'); document.querySelector('[data-act=cfUse][data-i="'+idx+'"]').click();
          const b2={text:g2.defects[0].text, cls:g2.defects[0].cls, action:g2.defects[0].action};
          const lg=newRecord(customers[0],'legionella'); lg.defects=[{text:'',cls:'',action:''}]; persistRec(lg); ui.rec=lg; ui.step=5; render();
          const li=document.querySelector('[data-act=cfUse][data-i="0"]'); li.click(); const lc=lg.defects[0];
          return {chips,a,hasSave,saved:!!saved&&saved.c==='AR'&&saved.a==='Isolated',b2,leg:[lc.text.length>0, lc.cls]}})()""")
        check('saved wording shows under the defect box', r['chips'] >= 4, r)
        check('tapping a wording fills the defect, its classification and action', r['a']['text'].startswith('No carbon monoxide') and r['a']['cls'] == 'NCS' and r['a']['action'], r)
        check('a new wording can be saved with its classification and reused', r['hasSave'] and r['saved'] and r['b2']['text'] == 'Radiator valve leaking' and r['b2']['cls'] == 'AR' and r['b2']['action'] == 'Isolated', r)
        check('legionella defects get the wording but never a gas classification', r['leg'][0] and r['leg'][1] == '', r)
        check('no page errors in saved wording', not errs, errs)
        ctx.close()

        # ---------- 12k. warning notice pulls the appliance details through ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const g=newRecord(customers[0],'gas'); g.applianceCount='2';
          g.appliances[0]=Object.assign(blankAppliance(),{location:'Kitchen',type:'Boiler',manufacturer:'Worcester',model:'Greenstar 30i',gc:'4731 2345',vent:'Pass',terminal:'Pass',flueOp:'Fail',safety:'Pass',safe:'No'});
          g.appliances[1]=Object.assign(blankAppliance(),{location:'Lounge',type:'Fire',manufacturer:'Valor',model:'Homeflame',gc:'41-123-45',vent:'Pass',terminal:'Pass',flueOp:'Pass',safety:'Pass'});
          g.defectCount='2'; g.defects=[{text:'Flue leaking products',cls:'ID',action:'Capped off',app:0},{text:'No vent',cls:'AR',action:'Advised',app:1}];
          const w=newWarnRecord({id:g.customerId,...g.customer}); WARN.prefillFrom(w,g,a=>a.model==='Greenstar 30i'?'SN123':'');
          return {n:w.faultCount,f:w.faults.slice(0,2).map(f=>[f.location,f.type,f.make,f.model,f.gc,f.serial,f.cls,f.notes])};
        })()""")
        check('warning notice: one fault per appliance with details, GC, serial and defects', r['n']=='2' and r['f'][0][:7]==['Kitchen','Boiler','Worcester','Greenstar 30i','4731 2345','SN123','ID'] and 'Flue leaking products' in r['f'][0][7] and r['f'][1][:7]==['Lounge','Fire','Valor','Homeflame','41-123-45','','AR'], r)
        check('no page errors in warning prefill', not errs, errs)
        ctx.close()

        # ---------- 12l. v199 pull-throughs ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const c={id:'cX',name:'Pat Smith',phone:'',email:'',billing:''};
          const q=newRecord(c,'quote'); q.jobAddress='1 Test St'; q.customerId='cX'; q.make='Vaillant'; q.model='ecoTEC 832'; q.kind='Heat only'; q.qStatus='accepted'; q.inspectionDate='2026-09-01'; persistRec(q);
          const cm=newRecord(c,'commission'); cm.jobAddress='1 Test St'; cm.customerId='cX'; persistRec(cm); const ok1=autoPrev(cm);
          // oil service on a job -> oil warning notice
          const o=newRecord(c,'oil'); o.jobId='J1'; o.jobAddress='1 Test St'; o.customerId='cX'; o.location='Kitchen'; o.make='Grant'; o.model='Vortex'; o.serial='SN9'; o.defectClass='At risk'; o.defects='Smoky flue'; persistRec(o);
          const w=newRecord(c,'oilwarn'); w.jobId='J1'; persistRec(w); goTo(w,1);
          // gas serial copies forward and legionella/aircon/tank copy from last visit
          const g1=newRecord(c,'gas'); g1.jobAddress='2 Test St'; g1.customerId='cX'; g1.appliances[0]=Object.assign(blankAppliance(),{location:'Kitchen',type:'Boiler',manufacturer:'Baxi',model:'Duo',gc:'47',serial:'ABC1'}); g1.inspectionDate='2025-01-01'; persistRec(g1);
          const g2=newRecord(c,'gas'); g2.jobAddress='2 Test St'; g2.customerId='cX'; persistRec(g2); autoPrev(g2);
          const l1=newRecord(c,'legionella'); l1.jobAddress='2 Test St'; l1.customerId='cX'; l1.coldSupply='Mains'; l1.hotType='Combi'; l1.inspectionDate='2025-01-01'; persistRec(l1);
          const l2=newRecord(c,'legionella'); l2.jobAddress='2 Test St'; l2.customerId='cX'; persistRec(l2); autoPrev(l2);
          const a1=newRecord(c,'aircon'); a1.jobAddress='2 Test St'; a1.customerId='cX'; a1.make='Daikin'; a1.indoorModel='FTX'; a1.inspectionDate='2025-01-01'; persistRec(a1);
          const a2=newRecord(c,'aircon'); a2.jobAddress='2 Test St'; a2.customerId='cX'; persistRec(a2); autoPrev(a2);
          const t1=newRecord(c,'oiltank'); t1.jobAddress='2 Test St'; t1.customerId='cX'; t1.capacity='1200'; t1.position='Outside, on the ground'; t1.inspectionDate='2025-01-01'; persistRec(t1);
          const t2=newRecord(c,'oiltank'); t2.jobAddress='2 Test St'; t2.customerId='cX'; persistRec(t2); autoPrev(t2);
          return {ok1,com:[cm.make,cm.model,cm.kind],ow:[w.f.appType,w.f.location,w.f.make,w.f.model,w.f.serial,w.f.cls,w.f.defect],gs:g2.appliances[0].serial,leg:[l2.coldSupply,l2.hotType],ac:[a2.make,a2.indoorModel],tank:[t2.capacity,t2.position]};
        })()""")
        check('commissioning fills from the quote', r['ok1'] and r['com']==['Vaillant','ecoTEC 832','Regular'], r)
        check('oil warning notice fills from the oil service', r['ow']==['Oil boiler','Kitchen','Grant','Vortex','SN9','At risk','Smoky flue'], r)
        check('gas serial copies forward', r['gs']=='ABC1', r)
        check('legionella, aircon and oil tank copy from last visit', r['leg']==['Mains','Combi'] and r['ac']==['Daikin','FTX'] and r['tank']==['1200','Outside, on the ground'], r)
        check('no page errors in v199 pull-throughs', not errs, errs)
        ctx.close()

        # ---------- 12m. defect acknowledged (not fixing) ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const c={id:'cY',name:'Lee Jones',phone:'07000000000',email:'',billing:''};
          const g=newRecord(c,'gas'); g.customerId='cY'; g.jobAddress='9 Test Rd'; g.status='complete'; g.applianceCount='1';
          g.appliances[0]=Object.assign(blankAppliance(),{location:'Kitchen',type:'Boiler',manufacturer:'Baxi',model:'Duo'});
          g.defectCount='1'; g.defects=[{text:'Flue leaking',cls:'AR',action:'Advised',app:0}]; persistRec(g);
          const before=FU.items().filter(x=>x.r.id===g.id).length;
          fuOpenTest=null;
          document.querySelector('[data-act=fuOpen]') ? 0 : 0;
          g.dfRes={g0:{d:'2026-10-18',st:'ack',note:'Customer declined'}}; persistRec(g);
          const after=FU.items().filter(x=>x.r.id===g.id).length;
          const st=FU.status(g,'g0');
          const cu=customers.find(z=>z.id==='cY')||c; const x={t:'gas',addr:'9 Test Rd',make:'Baxi',model:'Duo',title:'Boiler',loc:'Kitchen'};
          const h=HIST.html(x,c);
          return {before,after,st,hasAck:h.includes('chose not to have it repaired now')&&h.includes('Customer declined')&&h.includes('fuReopen')};
        })()""".replace("fuOpenTest=null;","").replace("document.querySelector('[data-act=fuOpen]') ? 0 : 0;",""))
        check('acknowledged defect leaves the follow-up list and shows in the appliance history', r['before']==1 and r['after']==0 and r['st']['st']=='ack' and r['hasAck'], r)
        check('no page errors in acknowledged defects', not errs, errs)
        ctx.close()

        # ---------- 12n. red alert on the appliance in the customer record ----------
        ctx, pg, errs = fresh(b)
        ev(pg, 'SAMPLE.add()')
        r = ev(pg, """(()=>{
          const c={id:'cZ',name:'Sam Hill',phone:'',email:'',billing:''}; customers.push(c);
          const g=newRecord(c,'gas'); g.customerId='cZ'; g.jobAddress='3 Test Rd'; g.status='complete'; g.applianceCount='1';
          g.appliances[0]=Object.assign(blankAppliance(),{location:'Kitchen',type:'Boiler',manufacturer:'Baxi',model:'Duo'});
          g.defectCount='1'; g.defects=[{text:'Flue leaking',cls:'ID',action:'Capped',app:0}]; persistRec(g);
          const h1=registerHtml(c);
          g.dfRes={g0:{d:'2026-10-18',st:'ack',note:'x'}}; persistRec(g); const h2=registerHtml(c);
          g.dfRes={g0:{d:'2026-10-18'}}; persistRec(g); const h3=registerHtml(c);
          g.dfRes=undefined; persistRec(g); const h4=registerHtml(c);
          ui.view='home'; HIST.open(g.id,true); const el=document.getElementById('hd-'+g.id+'-g0');
          return {red:h1.includes('1 open safety defect')&&h1.includes('immediately dangerous'),amber:h2.includes('Customer informed of 1 defect')&&!h2.includes('open safety'),clear:!h3.includes('open safety')&&!h3.includes('Customer informed of'),back:h4.includes('1 open safety defect'),focus:!!el&&el.style.border!==''};
        })()""")
        check('appliance shows a red open-defect bar, amber when informed, nothing when fixed', r['red'] and r['amber'] and r['clear'] and r['back'], r)
        check('tapping the bar opens the history at the fault', r['focus'], r)
        check('no page errors in appliance alert', not errs, errs)
        ctx.close()

        # ---------- 12o. email without a mail program (Chromebook) ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{
          const url='mailto:pat@example.com?subject='+encodeURIComponent('Gas safety & invoice')+'&body='+encodeURIComponent('Hi Pat,\\n\\nAttached.');
          const g=mailWebUrl('gmail',url), o=mailWebUrl('outlook',url), p=mailParts(url);
          openMail(url); const box=document.getElementById('mailBox');
          const btns=[...box.querySelectorAll('a[data-mk]')].map(a=>a.dataset.mk);
          box.remove();
          const opened=[]; const wo=window.open; window.open=(u)=>{opened.push(u); return null;};
          settings.mailApp='outlook'; const a=document.createElement('a'); a.href=url; document.body.appendChild(a); a.click(); a.remove();
          settings.mailApp='gmail'; const a2=document.createElement('a'); a2.href=url; document.body.appendChild(a2); a2.click(); a2.remove();
          window.open=wo; settings.mailApp='';
          return {g,o,p,btns,opened};
        })()""")
        check('gmail and outlook web links carry address, subject and message', r['g'].startswith('https://mail.google.com/mail/?view=cm') and 'to=pat%40example.com' in r['g'] and 'su=Gas%20safety%20%26%20invoice' in r['g'] and r['o'].startswith('https://outlook.office.com/mail/deeplink/compose?to=pat%40example.com') and r['p']['subject']=='Gas safety & invoice', r)
        check('email dialog offers Gmail, Outlook and the default program', r['btns']==['gmail','outlook','default'], r)
        check('a chosen webmail opens straight away from a mailto link', len(r['opened'])==2 and r['opened'][0].startswith('https://outlook.office.com') and r['opened'][1].startswith('https://mail.google.com'), r)
        check('no page errors in email chooser', not errs, errs)
        ctx.close()

        # ---------- 13. offline (service worker) ----------
        ctx = b.new_context(viewport={'width': 390, 'height': 800})
        pg = ctx.new_page()
        pg.goto(URL)
        pg.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.ready.then(()=>true)", timeout=15000)
        pg.wait_for_timeout(2500)
        ctx.set_offline(True)
        try:
            pg.reload()
            pg.wait_for_timeout(800)
            ok = pg.evaluate("typeof APP_VERSION==='string' && !!document.querySelector('#view')")
        except Exception as e:
            ok = False
        check('app opens with no signal (service worker cache)', ok)
        ctx.close()

        # ---------- 12p. date paid can be set on the invoice ----------
        ctx, pg, errs = fresh(b)
        ev(pg, "SAMPLE.add(); invoices.push(newInvoice([records[0]])); ui.view='home'; render()")
        r = ev(pg, """(async()=>{ const i=invoices[0]; if(!i) return 'no invoice'; i.paid=true; i.paidDate=todayISO(); ui.inv=i; ui.view='invEdit'; render(); await new Promise(r=>setTimeout(r,200));
          const el=document.querySelector('input.dth[data-n="paidDate"]'); if(!el) return 'no date paid box'; el.value='2026-10-17'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
          await new Promise(r=>setTimeout(r,200)); return invoices[0].paidDate; })()""")
        check('Date paid box on a paid invoice changes the date paid', r == '2026-10-17', r)
        ev(pg, "invoices[0].paid=false; render()")
        check('Date paid box is hidden when the invoice is not paid', ev(pg, "!document.querySelector('input.dth[data-n=\"paidDate\"]')"))
        check('no page errors setting the date paid', not errs, errs)
        ctx.close()

        # ---------- 12q. owner usage totals (counts only) ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{ ui.view='admin'; ui.admin={rows:[],err:'',usage:{records:12,records_finished:9,invoices:5,invoices_paid:3,customers:7,bookings:4,saved_7d:6,saved_30d:11,active_7d:2,active_30d:3,users_with_data:3,by_type:{gas:5,service:4},size_groups:{none_yet:1,one_to_5:1,six_to_20:1,over_20:0}}}; render(); return document.querySelector('#view').innerText; })()""")
        check('Admin page shows anonymous usage totals', 'Documents finished' in r and 'Gas safety record' in r and 'Boiler service record' in r and '9' in r, r[:300])
        ev(pg, "ui.admin={rows:[],err:'',usageErr:'Usage totals are not switched on yet. Run backend/v209-usage.sql once in Supabase.'}; render()")
        check('Admin page says how to switch usage totals on when the SQL has not been run', 'v209-usage.sql' in ev(pg, "document.querySelector('#view').innerText"))
        check('no page errors on the usage totals', not errs, errs)
        ctx.close()

        # ---------- 12r. auto-scheduled jobs waiting for Plan my day do not show as clashes ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{ const d=todayISO(); const mk=(id,auto,time)=>({id,date:d,time,mins:60,name:'J'+id,types:['gas'],status:'booked',auto,address:''});
          const run=(...bs)=>{ bookings.length=0; bs.forEach(x=>bookings.push(x)); return !!bkClash(bookings[0]); };
          return [run(mk('a1',true,'09:00'),mk('a2',true,'09:00')), run(mk('a1',true,'09:00'),mk('f1',false,'09:30')), run(mk('f1',false,'09:00'),mk('f2',false,'09:00')), run(mk('a1',true,'09:00'),mk('a2',true,'09:30'))]; })()""")
        check('auto jobs sharing a placeholder time are not flagged; auto vs fixed, fixed vs fixed and differently timed auto jobs still clash', r == [False, True, True, True], r)
        ctx.close()

        # ---------- 12s. choice of maps app ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{ const a='1 Test Road\\nLincoln\\nLN1 1AA'; const out=[]; settings.mapApp=''; out.push(mapsUrl(a)); settings.mapApp='apple'; out.push(mapsUrl(a)); settings.mapApp='waze'; out.push(mapsUrl(a));
          out.push(routeUrl([{address:a},{address:'2 Other St, Lincoln'}])); settings.mapApp='google'; out.push(routeUrl([{address:a},{address:'2 Other St, Lincoln'}])); return out; })()""")
        check('Navigate uses Google Maps by default', r[0].startswith('https://www.google.com/maps/dir/') and 'LN1%201AA' in r[0], r[0])
        check('Navigate can use Apple Maps', r[1].startswith('https://maps.apple.com/?dirflg=d&daddr=') and 'LN1%201AA' in r[1], r[1])
        check('Navigate can use Waze', r[2].startswith('https://waze.com/ul?navigate=yes&q=') and 'LN1%201AA' in r[2], r[2])
        check('Start route opens the first job in Waze but plans the whole day in Google Maps', r[3].startswith('https://waze.com/ul') and 'waypoints=' in r[4], r[3:])
        ev(pg, "ui.view='settings'; ui.sTab='app'; render()")
        check('Settings > App & account has a maps app choice', ev(pg, "!!document.querySelector('select[data-s=mapApp]')"))
        check('no page errors in maps choice', not errs, errs)
        ctx.close()

        # ---------- 12t. auto schedule books into a blank slot without asking ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{ const d=todayISO(); settings.dayStart='09:00'; bookings.length=0; const mk=(id,time,auto)=>({id,date:d,time,mins:60,name:'J'+id,types:['gas'],status:'booked',auto:!!auto,address:''});
          bookings.push(mk('f1','09:00',false), mk('f2','10:00',false));
          const B=mk('n1','09:00',true); const t1=bkFreeSlot(B); bookings.push(Object.assign(B,{time:t1}));
          const C=mk('n2','09:00',true); const t2=bkFreeSlot(C);
          let asked=false; window.confirm=()=>{asked=true;return false}; const ok=bkValid(Object.assign(mk('n3','09:00',true),{}));
          return {t1,t2,asked,ok}; })()""")
        check('auto schedule picks the first blank slot, one after another', r['t1'] == '11:00' and r['t2'] == '12:00', r)
        check('auto schedule does not ask "book anyway"', r['ok'] is True and r['asked'] is False, r)
        ctx.close()

        # ---------- 12u. saving a booking with Auto schedule arranges that day by distance ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ settings.address='1 Test Road\\nLincoln\\nLN1 2BN'; settings.routeStart=''; settings.dayStart='09:00'; settings.planOrder='near'; saveSettings();
          const D=addDays(localISO(),3); bookings.length=0; const pcAddr=pc=>'1 St\\nLincoln\\n'+pc;
          bookings.push({id:'fx',date:D,time:'09:00',mins:60,name:'Fixed',address:pcAddr('LN5 5AC'),types:['service'],status:'booked',auto:false});
          CLOUD.signedIn=()=>true; const M={'LN9 9AA':30,'LN1 1AB':10};
          CLOUD.post=async(n,b)=>{ const [f,t]=b.stops.map(s=>s.split(',')[0]); return {legs:[{mins:f==='LN1 2BN'?(M[t]||10):5,miles:3}]}; };
          const add=async(id,pc)=>{ ui.book={id,date:D,time:'09:00',mins:60,name:id,address:pcAddr(pc),types:['service'],status:'booked',auto:true,phone:'',email:''}; bkSave(); await new Promise(r=>setTimeout(r,600)); };
          await add('far','LN9 9AA'); await add('near','LN1 1AB');
          const tm=id=>bookings.find(b=>b.id===id).time; return {fx:tm('fx'),near:tm('near'),far:tm('far')}; })()""")
        check('Auto schedule arranges the day by distance when a booking is saved', r['near'] < r['far'] and r['near'] >= '10:00', r)
        check('Auto schedule leaves a fixed-time job where it was', r['fx'] == '09:00', r)
        check('no page errors in Auto schedule', not errs, errs)
        ctx.close()

        # ---------- 12v. same as job address ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ customers.length=0; records.length=0; const cu={id:'c9',name:'Ann',phone:'',email:'',billing:'',properties:['1 High St\\nLincoln\\nLN1 1AA'],updated:1}; customers.push(cu);
          ui.pick={types:{service:true},customer:cu}; startJob(); ui.rec.jobAddress='1 High St\\nLincoln\\nLN1 1AA'; render();
          document.querySelector('[data-act="sameBill"]').click(); await new Promise(r=>setTimeout(r,300)); return {b:ui.rec.customer.billing, c:customers[0].billing}; })()""")
        check('Same as job address fills the client address', r['b'] == '1 High St\nLincoln\nLN1 1AA' and r['c'] == r['b'], r)
        check('no page errors in same-as-job', not errs, errs)
        ctx.close()

        # ---------- 12w. swipe a sheet down to close ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ showNewSheet(); const s=document.querySelector('#newSheet .sheet'), g=s.querySelector('.grab');
          const T=(type,y)=>{ const t=new Touch({identifier:1,target:g,clientX:50,clientY:y}); g.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]})); };
          T('touchstart',300); T('touchmove',330); T('touchmove',340); T('touchend',340); await new Promise(r=>setTimeout(r,300)); const small=!!document.getElementById('newSheet');
          const s2=document.querySelector('#newSheet .sheet'), g2=s2.querySelector('.grab'); const T2=(type,y)=>{ const t=new Touch({identifier:1,target:g2,clientX:50,clientY:y}); g2.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[t],changedTouches:[t]})); };
          T2('touchstart',300); T2('touchmove',350); T2('touchmove',480); T2('touchend',480); await new Promise(r=>setTimeout(r,400));
          return {stayed:small, closed:!document.getElementById('newSheet')}; })()""")
        check('a short drag leaves the sheet open', r['stayed'], r)
        check('swiping a sheet down closes it', r['closed'], r)
        check('no page errors in swipe close', not errs, errs)
        ctx.close()

        # ---------- 12x. property contact ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ customers.length=0; records.length=0; bookings.length=0;
          const A1='1 High St\\nLincoln\\nLN1 1AA', A2='2 Low Rd\\nLincoln\\nLN2 2BB';
          customers.push({id:'ag',name:'Agent Ltd',phone:'01522 000000',email:'',billing:'',properties:[A1,A2],updated:1});
          ui.cust={...customers[0]}; ui.view='custEdit'; render();
          const inp=(i,f,v)=>{ const e=document.querySelector('[data-pi="'+i+'|'+f+'"]'); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
          inp(1,'n','Tina Tenant'); inp(1,'p','07700 900123'); inp(1,'a','Ring first');
          saveCust(true);
          const saved=customers[0]; const hit=propContact(saved,A2), miss=propContact(saved,A1);
          const html=propContactHtml(saved,A2);
          return {hit, miss, call:/tel:07700900123/.test(html), note:/Ring first/.test(html)}; })()""")
        check('property contact is saved against the right address', r['hit'] and r['hit']['n'] == 'Tina Tenant' and not r['miss'], r)
        check('property contact shows a call button and the access note', r['call'] and r['note'], r)
        check('no page errors in property contact', not errs, errs)
        ctx.close()

        # ---------- 12y. visual inspection only ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ const rec=newRecord({id:'c1',name:'A B'},'gas'); records.push(rec); const a=rec.appliances[0];
          const before=validate(rec).length; a.visualOnly='Yes'; ['test','op','hi','vent','terminal','flueOp','safety'].forEach(k=>a[k]='');
          const bad=validate(rec).filter(x=>/appliance 1|^1\\b/i.test(String(x.label))&&/ventilation|flue visual|flue operation|safety devices|operating pressure|gas rate|which tests/i.test(String(x.label))).length;
          let pdf='ok'; try{ const bl=await buildPdf(rec,settings); if(bl.size<3000) pdf='tiny'; }catch(e){ pdf=String(e); }
          ui.rec=rec; ui.view='form'; ui.step=1; ui.appTab=0; render(); const txt=document.body.innerText;
          return {bad,pdf,note:/Visual inspection only\\./.test(txt),hasTest:/Which tests can be performed/.test(txt)}; })()""")
        check('visual inspection only skips the physical checks in validation', r['bad'] == 0, r)
        check('visual inspection only still makes a PDF', r['pdf'] == 'ok', r)
        check('visual inspection only hides the test boxes on the form', r['note'] and not r['hasTest'], r)
        check('no page errors in visual inspection only', not errs, errs)
        ctx.close()

        # ---------- 12z. fewer appliances removes the removed appliance's defects ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{ const rec=newRecord({id:'c1',name:'A B'},'gas'); records.push(rec); ui.rec=rec; rec.applianceCount='4'; while(rec.appliances.length<4) rec.appliances.push(blankAppliance());
          rec.defects=[Object.assign(blankDefect(),{app:0,text:'keep',cls:'AR',action:'x'}),Object.assign(blankDefect(),{app:3})]; rec.defectCount='2';
          const before=validate(rec).filter(x=>/Appliance 4 defect/.test(x.label)).length;
          onChoice('applianceCount','3');
          const after=validate(rec).filter(x=>/Appliance 4 defect/.test(x.label)).length;
          return {before,after,left:rec.defects.length,count:rec.defectCount,kept:rec.defects[0].text}; })()""")
        check('removing an appliance drops the defects noted against it', r['before'] > 0 and r['after'] == 0 and r['left'] == 1 and r['count'] == '1' and r['kept'] == 'keep', r)
        check('no page errors in removing an appliance', not errs, errs)
        ctx.close()

        # ---------- 12aa. bonding NA ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(()=>{ const rec=newRecord({id:'c1',name:'A B'},'gas'); records.push(rec); ui.rec=rec; ui.step=2; render();
          const labels=[...document.querySelectorAll('.f, .card')].map(e=>e.innerText).join('|');
          rec.bonding='NA'; const na=WARN.neededFor(rec); rec.bonding='Fail'; const fail=WARN.neededFor(rec);
          return {na,fail,opts:OPT.pfn.join(',')}; })()""")
        check('bonding NA does not need a warning notice, Fail does', (not r['na']) and r['fail'], r)
        check('no page errors for bonding NA', not errs, errs)
        ctx.close()

        # ---------- 12ab. opening a finished quote skips the review page ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ const c={id:'qc1',name:'Dan Cole',phone:'07700900222',email:'d@x.com',billing:'2 High St',properties:['6 Elm Rd\\nLincoln\\nLN6 7QD']};customers.push(c);saveCustomers();const q=newRecord(c,'quote');q.customerId='qc1';q.jobAddress='6 Elm Rd\\nLincoln\\nLN6 7QD';q.make='Worcester';q.model='30i';q.kind='Heat only';q.boilerPrice='2240';q.fluePrice='220';q.labourPrice='180';q.labourQty='1';q.lines=[{name:'Magnetic filter',qty:'1',price:'180'}];q.status='complete';q.qStatus='';q.qDate=localISO();records.push(q);saveRecords();
          ui.view='invoices'; ui.invTab='quotes'; render(); const btn=document.querySelector('[data-act=openRec][data-id="'+q.id+'"]'); if(!btn) return {nobtn:true};
          btn.click(); await new Promise(r=>setTimeout(r,1500));
          const t=document.body.innerText; return {review:/items? to complete|Open documents/.test(t), made:!!ui.pdfs[q.id]}; })()""")
        check('opening a finished quote goes straight to the open / edit screen', r.get('made') and not r.get('review'), r)
        check('no page errors opening a quote', not errs, errs)
        ctx.close()

        # ---------- 12ad. sample data feeds the reminder screen ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, "(()=>{customers.length=0;records.length=0;SAMPLE.add();const it=remItems().filter(x=>x.r.sample);return it.map(x=>x.t+':'+x.days)})()")
        check('sample data gives a service due soon and an overdue gas check', sorted(r) == sorted(['gas:-5', 'service:21']), str(r))
        check('no page errors with sample reminders', not errs, errs)
        ctx.close()

        # ---------- 12ae. manufacturer figures (info button + green/red) ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ const out={};
          const bx=BT.BUILTIN.find(x=>x.name==='Greenstar 24Ri'); out.seeded=!!bx && bx.t_co==='200';
          const cu={id:'c9',name:'Tol Test',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Greenstar 24Ri'; rec.fpTaken='YES'; rec.fpValue='-3.5'; rec.fgDone='YES';
          rec.fgCoMax='250'; rec.fgCo2Max='9.9'; rec.fgCo2Min='11'; rec.fgRatioMax='0.001'; rec.bpTaken='YES'; rec.bpValue='15';
          ui.rec=rec; ui.view='form'; ui.step=4; render(); await new Promise(r=>setTimeout(r,200));
          const cls=p=>{const e=document.querySelector('.f[data-f="'+p+'"]'); return e?e.className:'missing'};
          out.i=document.querySelectorAll('.tolI').length;
          out.co=cls('fgCoMax'); out.co2=cls('fgCo2Max'); out.co2min=cls('fgCo2Min'); out.ratio=cls('fgRatioMax'); out.inlet=cls('bpValue'); out.fan=cls('fpValue');
          ui.step=1; render(); await new Promise(r=>setTimeout(r,200)); document.querySelector('.f[data-f=model] .tolI').click(); out.sheet=(document.getElementById('btSheet')||{}).innerText||'';
          return out})()""")
        wr = ev(pg, "(()=>{settings.qList=[{id:'w1',type:'Boiler',make:'Worcester Bosch',name:'Greenstar 24Ri',kind:'Combination',kw:'24',warranty:'',unit:'',cost:'',markup:'',price:''}]; delete settings.btWarr; BT.seed(); return settings.qList[0].warranty})()")
        ad = ev(pg, "(()=>{settings.qList=[]; delete settings.btAdded; qSeed(); const n=settings.qList.filter(x=>x.name==='Greenstar 24Ri').length; const g=settings.qList.find(x=>x.name==='Greenstar 24Ri'); settings.qList=settings.qList.filter(x=>x!==g); qSeed(); return [n, settings.qList.filter(x=>x.name==='Greenstar 24Ri').length, g.warranty, g.t_co]})()")
        check('built-in boilers are added to the Price list once, and stay deleted', ad == [1, 0, '5 years', '200'], ad)
        gcs = ev(pg, "(()=>[['12','41-311-63'],['15','41-311-75'],['18','41-311-77'],['24','41-311-65']].map(([m,g])=>{const x=BT.find('','x',g); return x&&x.name==='Greenstar '+m+'Ri'&&x.kind==='Heat only'&&!!x.t_co2Max}))()")
        check('Greenstar 12, 15, 18 and 24 Ri are found by GC number', gcs == [True, True, True, True], gcs)
        g4 = ev(pg, "(()=>{settings.qList=[]; delete settings.btAdded; qSeed(); const x=settings.qList.filter(y=>y.name==='Greenstar 4000 System 18kW'); const f=BT.find('Worcester Bosch','Greenstar 4000 System 24kW',''); return [x.length, x[0]&&x[0].t_gc, f&&f.t_fan, f&&BT.judge('fan','-3.6',f), f&&BT.judge('fan','-3.0',f), f&&BT.judge('co2Max','9.9',f), BT.find('','x','41-800-07').kw]})()")
        check('Greenstar 4000 System figures: found, filled into the starter item, fan ranges work', g4 == [1, '41-800-11', '3.5', True, False, False, '12'], g4)
        g5 = ev(pg, "(()=>{const f=(m,g)=>{const x=BT.find('Worcester Bosch',m,g||''); return x&&x.name}; return [f('Greenstar 12Ri ErP'), f('Greenstar 12Ri'), f('x','41-406-47'), f('Greenstar 4000 30kW'), f('Greenstar R40 HE'), BT.judge('fan','-5.0',BT.find('','','47-800-32')), BT.judge('fan','-5.3',BT.find('','','47-800-32'))]})()")
        check('Ri ErP, 4000 combi and R29/R40 HE are found, longest name first', g5 == ['Greenstar 12Ri ErP', 'Greenstar 12Ri', 'Greenstar 24Ri ErP', 'Greenstar 4000 30kW', 'Greenstar R40 HE', False, True], g5)
        g6 = ev(pg, "(()=>{const x=BT.find('Worcester Bosch','Greenstar 40CDi Conventional',''); return [x&&x.t_gc, BT.find('','','41-311-71').t_co2Max, BT.judge('co2Max','10.0',x), BT.judge('co2Max','9.5',x)]})()")
        check('Greenstar CDi found by model and GC, CO2 tolerance 0.2', g6 == ['41-311-72', '9.6', False, True], g6)
        g7 = ev(pg, "(()=>{const a=BT.find('','x','47-800-26'), b=BT.find('','x','47-800-17'); return [a.t_gc, BT.judge('co2Max','10.5',a), BT.judge('co2Max','11.0',a), BT.judge('co2Min','8.0',a), BT.judge('co2Min','8.5',a), BT.judge('coLow','80',b), BT.judge('coLow','70',b), BT.judge('co','200',b), BT.judge('fan','-3.6',b), BT.find('','x','47-800-18').t_fan||'']})()")
        check('2000 and 8000 combi: CO2 range, separate CO at minimum, fan', g7 == ['47-800-26', True, False, False, True, False, True, True, True, ''], g7)
        g8 = ev(pg, "(()=>{const a=BT.find('','x','47-387-04'), b=BT.find('','x','41-860-29'), c=BT.find('Ideal','Vogue Max 32kW',''); return [a.name, a.t_gc, BT.judge('co2Max','9.9',a), BT.judge('co2Max','10.1',a), BT.judge('co','349',a), BT.judge('co','351',a), BT.judge('ratio','0.0039',a), BT.judge('ratio','0.0041',a), BT.judge('inlet','17',a), b.name, c&&c.t_gc, BT.BUILTIN.filter(x=>x.make==='Ideal').length]})()")
        check('Ideal boilers: GC lookup, CO2 +/-0.7, CO 350, ratio 0.004, 18 mbar', g8 == ['Logic Max Combi2 30kW', '47-387-04', True, False, True, False, True, False, False, 'Logic Max Heat2 30kW', '47-349-60', 34], g8)
        gw = ev(pg, "(()=>{const f=(g)=>BT.find('','x',g); const a=f('41-406-90'), b=f('41-406-94'), c=f('47-800-44'), d=f('47-406-65'), e=f('47-406-77'); const dup={}; BT.BUILTIN.forEach(x=>{dup[x.id]=(dup[x.id]||0)+1}); return [a.name, a.t_hi, a.t_fan, b.name, b.t_hi, b.t_fan, c.name, c.t_fan, d.name, d.t_co2Tol, e.t_co2MaxF, e.t_co2MaxT, BT.judge('co2Max','9.9',a), BT.judge('co2Max','10.0',a), Object.values(dup).some(n=>n>1)]})()")
        check('More Worcester: Life/Style/8000+/CDi/Compact GC lookups and figures', gw == ['Greenstar 8000 Life System 35kW', '34.4', '3.5', 'Greenstar 8000 Life Regular 50kW', '48.9', '6.0', 'Greenstar 8000+ Combi 32kW V2', '8.0', 'Greenstar 29CDi Classic ErP', '0.4', '8.5', '10.1', True, False, False], gw)
        gb = ev(pg, "(()=>{const a=BT.find('','x','47-583-36'), b=BT.find('Biasi','Advance Plus 25S ERP',''); const ids={}; BT.BUILTIN.forEach(x=>{ids[x.id]=(ids[x.id]||0)+1}); return [a.make, a.name, a.t_gc, a.t_hi, BT.judge('co2Max','9.5',a), BT.judge('co2Max','9.9',a), b.t_gc, b.t_inlet, BT.BUILTIN.filter(x=>x.make==='Biasi').length, Object.values(ids).some(n=>n>1)]})()")
        check('Biasi: GC lookup, CO2 ranges, no duplicates', gb == ['Biasi', 'Advance Plus 30C ERP', '47-583-36', '30.0', True, False, '41-583-28', '17', 32, False], gb)
        g9 = ev(pg, "(()=>{const a=BT.find('','x','47-077-56'), b=BT.find('','x','47-364-38'), c=BT.find('','x','47-044-71'), d=BT.find('','x','41-694-47'); return [a.name, BT.judge('co2Max','9.0',a), BT.judge('co2Max','9.6',a), BT.judge('co2Min','8.7',a), b.name, BT.judge('co2Max','8.1',b), BT.judge('co2Max','9.7',b), c.name, BT.judge('co2Max','9.9',c), BT.judge('co2Max','10.4',c), BT.judge('ratio','0.0030',c), BT.judge('ratio','0.0032',c), d.name, d.t_co2Max||'']})()")
        check('Baxi, Vaillant and Vokera boilers: GC lookup and CO2 ranges', g9 == ['600 Combi 30kW', True, False, False, 'Evolve 28C', True, False, 'ecoFIT sustain 25kW', True, False, True, False, 'ecoTEC plus System 20kW', ''], g9)
        g10 = ev(pg, "(()=>{const a=BT.find('','x','47-532-69'), b=BT.find('','x','47-267-59'), c=BT.find('','x','41-019-21'); return [a.name, BT.judge('co2Max','9.4',a), BT.judge('co2Max','10.3',a), b.name, BT.judge('co2Max','9.3',b), BT.judge('co2Min','8.0',b), c.name, BT.judge('ratio','0.0030',c), BT.BUILTIN.filter(x=>['Alpha','Ferroli','Glow Worm','Viessmann'].includes(x.make)).length]})()")
        check('Alpha, Ferroli and Glow-worm boilers: GC lookup and CO2 ranges', g10 == ['E-Tec 28kW', False, False, 'T-One 25C', False, False, 'Energy r 12kW', True, 75], g10)
        g11 = ev(pg, "(()=>{const a=BT.find('Ideal','i mini 24kw',''); return [a&&a.t_gc, BT.BUILTIN.some(x=>/i-mini2/i.test(x.name))]})()")
        check('I-Mini 24kW finds its GC number from the typed model', g11 == ['47-387-15', False], g11)
        g12 = ev(pg, "(()=>{ settings.qList=[]; settings.btAdded=[]; settings.btKind=0; settings.btKind2=0; settings.btGlow=0; qSeed(); BT.seed(); const L=settings.qList.filter(x=>x.type==='Boiler'); const f=n=>L.find(x=>x.name===n); const gw=L.filter(x=>/glow/i.test(x.make)); return [f('600 Combi 24kW').kind, f('Logic Max Combi 24kW').kind, f('Greenstar 24Ri').kind, new Set(gw.map(x=>x.make)).size, gw.filter(x=>x.name==='Energy c 25kW').length, f('Energy c 25kW').t_gc]})()")
        check('Price list: boiler types kept, Glow Worm written one way, no duplicates', g12 == ['Combination', 'Combination', 'Heat only', 1, 1, '47-019-24'], g12)
        gq = ev(pg, """(async()=>{ const out={}; const cu={id:'gq1',name:'Gc Search',phone:'1',address:'1 A St'}; customers.push(cu); const rec=newRecord(cu,'service'); rec.make='Baxi'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,250));
          const inp=document.querySelector('.f[data-f=model] input'); inp.value='41-406-47'; inp.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,200));
          const b=document.querySelector('#btSug [data-bts]'); out.n=document.querySelectorAll('#btSug [data-bts]').length; b.click(); await new Promise(r=>setTimeout(r,300));
          out.make=ui.rec.make; out.model=ui.rec.model; out.gc=ui.rec.gc; return out})()""")
        check('typing a GC number in the model box fixes make, model and GC', gq['n'] == 1 and gq['make'] == 'Worcester Bosch' and gq['model'] == 'Greenstar 24Ri ErP' and gq['gc'] == '41-406-47', gq)
        check('Greenstar 24Ri gets its 5-year warranty', wr == '5 years', wr)
        check('figures built in for the Greenstar 24Ri', r['seeded'], r)
        fr = ev(pg, "(()=>{const x=BT.BUILTIN[0]; return ['-3.1','-3.7','-10','-3','-2','0','-11','3.5'].map(v=>BT.judge('fan',v,x))})()")
        fr2 = ev(pg, """(async()=>{ const cu={id:'fx1',name:'Fan Fix',phone:'1',address:'1 A St'}; customers.push(cu); const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Greenstar 24Ri'; rec.fpTaken='YES'; ui.rec=rec; ui.view='form'; ui.step=4; render(); await new Promise(r=>setTimeout(r,300));
          const inp=document.querySelector('.f[data-f=fpValue] input'); inp.value='3.6'; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,300));
          return [inp.value, ui.rec.fpValue]})()""")
        check('fan pressure: a plain number gets its minus added', fr2 == ['-3.6', '-3.6'], fr2)
        fr3 = ev(pg, "(()=>{const x=Object.assign({},BT.BUILTIN[0],{t_fanPF:'4',t_fanPT:'8',t_fanFF:'0',t_fanFT:'3'}); return ['-5','-3.5','-9','-2','5'].map(v=>BT.judge('fan',v,x))})()")
        check('fan pressure: pass and fail ranges on the boiler are used', fr3 == [True, False, False, False, True], fr3)
        check('fan pressure: -3.1 to -10 passes, -3 to 0 fails (minus assumed)', fr == [True, True, True, False, False, False, False, True], fr)
        check('info buttons appear beside the readings', r['i'] >= 8, r['i'])
        check('CO over the limit is red, CO2 inside is green, CO2 outside is red', 'tolbad' in r['co'] and 'tolok' in r['co2'] and 'tolbad' in r['co2min'] and 'tolok' in r['ratio'], r)
        check('low gas inlet pressure is red and fan pressure -3.5 is green', 'tolbad' in r['inlet'] and 'tolok' in r['fan'], r)
        check('info sheet shows every line of the data sheet', all(t in r['sheet'] for t in ['Room Sealed', '24.62', '9.8', '9.2', '0.0020', '200', '3.1', '16.5', '41-311-65']), r['sheet'])
        r = ev(pg, "(()=>{ const x=BT.BUILTIN[0]; return [!!BT.find('Worcester Bosch','Greenstar 24Ri',''), !!BT.find('','x','4131165'), !!BT.find('Vaillant','Greenstar 24Ri',''), !!BT.find('','','')] })()")
        check('boiler is matched by make and model or by GC number only', r == [True, True, False, False], r)
        check('no page errors with manufacturer figures', not errs, errs)
        ctx.close()

        # ---------- 12af. warning notice is a question, not forced ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; SAMPLE.add(); const g=records.find(x=>typeOf(x)==='gas'); g.status='draft'; g.appliances[0].safe='No'; persistRec(g);
          ui.rec=g; ui.job=null; ui.view='form'; ui.step=stepsOf(g).length-1; render();
          const sel=s=>document.querySelector(s);
          out.ask=!!sel('[data-act=warnNo]') && !!sel('[data-act=addWarn]'); out.disabled=!!(sel('[data-act=makePdf]')||{}).disabled;
          sel('[data-act=warnNo]').click(); await new Promise(r=>setTimeout(r,200));
          out.after=!!sel('[data-act=warnNo]'); out.again=!!sel('[data-act=addWarn]'); out.enabled=!(sel('[data-act=makePdf]')||{disabled:true}).disabled; out.flag=g.warnNo===true;
          return out})()""")
        check('review asks whether to create a warning notice, and Create documents waits for the answer', r['ask'] and r['disabled'], r)
        check('answering No lets you carry on and still offers Create one after all', not r['after'] and r['again'] and r['enabled'] and r['flag'], r)
        check('no page errors answering the warning notice question', not errs, errs)
        ctx.close()

        # ---------- 12ag. out of range pop-up ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const cu={id:'c8',name:'Out Range',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Greenstar 24Ri'; rec.fgDone='YES'; ui.rec=rec; ui.view='form'; ui.step=4; render(); await new Promise(r=>setTimeout(r,150));
          const put=(p,v)=>{const i=document.querySelector('.f[data-f="'+p+'"] input'); i.value=v; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true}))};
          put('fgCoMax','150'); await new Promise(r=>setTimeout(r,200)); out.quiet=!document.getElementById('btOut');
          put('fgCoMax','250'); await new Promise(r=>setTimeout(r,250)); out.pop=!!document.getElementById('btOut'); out.text=(document.getElementById('btOut')||{}).innerText||'';
          document.querySelector('#btOut [data-bt=FAIL]').click(); await new Promise(r=>setTimeout(r,150));
          out.fail=ui.rec.fgResult; out.gone=!document.getElementById('btOut'); return out})()""")
        check('no pop-up while the reading is inside the figure', r['quiet'], r)
        check('out of range reading shows a pop-up with Pass / Fail that sets the result', r['pop'] and 'Out of range' in r['text'] and r['fail'] == 'FAIL' and r['gone'], r)
        check('no page errors with the out of range pop-up', not errs, errs)
        ctx.close()

        # ---------- 12ah. GC number fills in from the saved boiler ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const cu={id:'c7',name:'Gc Fill',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,150));
          const put=(p,v)=>{const i=document.querySelector('.f[data-f="'+p+'"] input'); i.value=v; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true}))};
          put('model','Greenstar 24Ri'); await new Promise(r=>setTimeout(r,250)); out.gc=ui.rec.gc; out.box=document.querySelector('.f[data-f=gc] input').value;
          ui.rec.gc='99-999-99'; put('model','Greenstar 24Ri '); await new Promise(r=>setTimeout(r,250)); out.kept=ui.rec.gc; return out})()""")
        check('GC number fills in when the model matches a saved boiler', r['gc'] == '41-311-65' and r['box'] == '41-311-65', r)
        check('a GC number already entered is never overwritten', r['kept'] == '99-999-99', r)
        r = ev(pg, """(async()=>{ const out={}; const put=(p,v)=>{const i=document.querySelector('.f[data-f="'+p+'"] input'); i.value=v; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true}))};
          const x=BT.BUILTIN[0]; const y=Object.assign({},x,{id:'zz1',name:'Greenstar 30Ri',t_gc:'41-311-88'}); settings.qList.push(y);
          ui.rec.gc=''; ui.rec.gcAuto=''; ui.rec.model=''; render(); await new Promise(r=>setTimeout(r,100));
          put('model','Greenstar 24Ri'); await new Promise(r=>setTimeout(r,250)); out.a=ui.rec.gc;
          put('model','Greenstar 30Ri'); await new Promise(r=>setTimeout(r,250)); out.b=ui.rec.gc;
          put('gc','11-111-11'); await new Promise(r=>setTimeout(r,100)); put('model','Greenstar 24Ri'); await new Promise(r=>setTimeout(r,250)); out.c=ui.rec.gc; return out})()""")
        check('GC number follows the model, but a number typed by hand is kept', r['a'] == '41-311-65' and r['b'] == '41-311-88' and r['c'] == '11-111-11', r)
        check('no page errors filling the GC number', not errs, errs)
        ctx.close()

        # ---------- 12ai. info panel shows the data sheet only ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const cu={id:'c6',name:'Fan Info',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Greenstar 24Ri'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,200));
          const b=document.querySelector('.f[data-f=model] .tolI'); out.btn=!!b; if(b) b.click(); const s=document.getElementById('btSheet'); out.text=s?s.innerText:''; out.link=!!(s&&s.querySelector('a')); return out})()""")
        check('model box has an info button that opens the data sheet panel', r['btn'] and all(t in r['text'] for t in ['Flue Type', 'CH Max Heat Input (Kw Net)', 'CH Min Heat Input (Kw Net)', 'Max CO2 %', 'Min CO2 %', 'Maximum Ratio', 'Maximum CO (ppm)', 'Fan Pressure', 'Min Gas Inlet Working Pressure (mb)']), r)
        check('the panel has no web link or extra explanation', not r['link'] and 'About the fan pressure test' not in r['text'], r)
        check('no page errors with the info panel', not errs, errs)
        ctx.close()

        # ---------- 12aj. model search box ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const cu={id:'c5',name:'Model Search',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,150));
          const i=document.querySelector('.f[data-f=model] input'); i.value='green 24'; i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,100));
          const b=document.querySelector('#btSug [data-bts]'); out.n=document.querySelectorAll('#btSug [data-bts]').length; out.first=b?b.innerText:'';
          const g=[...document.querySelectorAll('#btSug [data-bts]')].find(x=>/24Ri/.test(x.innerText)); if(g) g.click(); await new Promise(r=>setTimeout(r,200));
          out.model=ui.rec.model; out.gc=ui.rec.gc; out.gone=!document.getElementById('btSug');
          i.value='zzzz'; i.dispatchEvent(new Event('input',{bubbles:true})); out.none=!document.getElementById('btSug'); return out})()""")
        check('typing in the model box suggests boilers and tapping one fills model and GC', r['n'] >= 1 and r['model'] == 'Greenstar 24Ri' and r['gc'] == '41-311-65' and r['gone'], r)
        check('no suggestions for rubbish', r['none'], r)
        check('no page errors in the model search', not errs, errs)
        ctx.close()

        # ---------- 12aj2. pick a model from a scrolling list ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const cu={id:'c5b',name:'List Pick',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Biasi'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,300));
          const btn=document.querySelector('.btPickRow button'); out.btn=!!btn; if(btn) btn.click(); await new Promise(r=>setTimeout(r,150));
          const box=document.getElementById('btSug'); out.n=box?box.querySelectorAll('[data-bts]').length:0; out.scroll=box?getComputedStyle(box).overflowY:''; out.only=box?[...box.querySelectorAll('.s')].every(x=>/Biasi/.test(x.innerText)):false;
          if(box) box.scrollIntoView({block:'start'}); await new Promise(r=>setTimeout(r,200)); window.__out=out; return out})()""")
        pg.screenshot(path='/tmp/list_open.png')
        r = ev(pg, """(async()=>{ const out=window.__out; const box=document.getElementById('btSug');
          const g=box&&[...box.querySelectorAll('[data-bts]')].find(x=>/Inovia 25C ERP/.test(x.innerText)); if(g) g.click(); await new Promise(r=>setTimeout(r,250));
          out.model=ui.rec.model; out.gc=ui.rec.gc; out.gone=!document.getElementById('btSug'); out.one=document.querySelectorAll('.btPickRow').length; return out})()""")
        check('Pick model from list shows every model for the make, scrolls, and fills model and GC', r['btn'] and r['n'] >= 30 and r['scroll'] == 'auto' and r['only'] and r['model'] == 'Inovia 25C ERP' and r['gc'] == '47-583-38' and r['gone'] and r['one'] == 1, r)
        check('no page errors with the model list', not errs, errs)
        pg.screenshot(path='/tmp/list_done.png')
        ctx.close()

        # ---------- 12aj3. gas rate calculator on the service form ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const cu={id:'c5c',name:'Gas Calc',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Greenstar 24Ri'; rec.grTaken='YES'; ui.rec=rec; ui.view='form'; ui.step=4; render(); await new Promise(r=>setTimeout(r,300));
          document.querySelector('[data-act=calcToggle]').click(); await new Promise(r=>setTimeout(r,100));
          const set=(k,v)=>{const i=document.querySelector('input[data-calc$=".'+k+'"]'); i.value=v; i.dispatchEvent(new Event('input',{bubbles:true}))};
          set('start','100'); set('end','100.1');
          document.querySelector('[data-act=calcTimer]').click(); let mut=0; const mo=new MutationObserver(m=>{mut+=m.length}); mo.observe(document.getElementById('view'),{childList:true,subtree:true});
          await new Promise(r=>setTimeout(r,1000)); mo.disconnect(); out.mut=mut;
          document.querySelector('[data-act=calcTimer]').click(); await new Promise(r=>setTimeout(r,200));
          out.res=document.querySelector('.calcres').innerText.replace(/\s+/g,' ');
          document.querySelector('[data-act=calcUse]').click(); await new Promise(r=>setTimeout(r,200));
          out.val=ui.rec.grValue; out.box=document.querySelector('.f[data-f=grValue] input').value; return out})()""")
        check('service form gas rate calculator: times, works out the rate and fills the box; the form is not redrawn while timing', r['mut'] < 60 and float(r['val']) > 0 and r['box'] == r['val'] and 'H.I. net' in r['res'], r)
        check('no page errors in the service form calculator', not errs, errs)
        ctx.close()

        # ---------- 12ak. model search works before the Price list was ever opened ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; settings.qList=[{id:'q1',type:'Boiler',make:'Worcester Bosch',name:'Greenstar 4000',kind:'Combination',kw:'25',warranty:'',unit:'',cost:'',markup:'',price:''}]; settings.qStarterV=2; delete settings.btSeed; saveSettings();
          const cu={id:'c4',name:'Fresh Phone',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,150));
          const i=document.querySelector('.f[data-f=model] input'); i.value='green ri'; i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,150));
          out.hits=[...document.querySelectorAll('#btSug [data-bts]')].map(x=>x.innerText); return out})()""")
        check('typing green ri finds the Greenstar 24Ri even if the Price list was never opened', any('24Ri' in h for h in r['hits']), r)
        check('no page errors in the first-time model search', not errs, errs)
        ctx.close()

        # ---------- 12al. a half-typed model does not match a boiler ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ qSeed(); const cu={id:'c3',name:'Half Typed',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,150));
          const i=document.querySelector('.f[data-f=model] input'); i.value='gree'; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,250));
          return {gc:ui.rec.gc, info:document.querySelectorAll('.tolI').length, full:!!BT.find('Worcester Bosch','Greenstar 24Ri',''), long:!!BT.find('Worcester','Worcester Greenstar 24 Ri','')} })()""")
        check('a half-typed model fills no GC number', r['gc'] == '', r)
        check('the full model name still matches', r['full'] and r['long'], r)
        check('no page errors with a half-typed model', not errs, errs)
        ctx.close()

        # ---------- 12am. the (i) shows only where there is a card, and a reading shows only its own figures ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const cu={id:'c2',name:'Card Test',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Some Other Boiler'; rec.bpTaken='YES'; ui.rec=rec; ui.view='form'; ui.step=1; render(); await new Promise(r=>setTimeout(r,200));
          out.noneNoCard=document.querySelectorAll('.tolI').length;
          rec.model='Greenstar 24Ri'; rec.grTaken='YES'; rec.fpTaken='YES'; rec.fgDone='YES'; render(); await new Promise(r=>setTimeout(r,200));
          document.querySelector('.f[data-f=model] .tolI').click(); out.full=document.getElementById('btSheet').innerText; document.getElementById('btSheet').remove();
          ui.step=4; render(); await new Promise(r=>setTimeout(r,200));
          const part=p=>{ document.querySelector('.f[data-f="'+p+'"] .tolI').click(); const t=document.getElementById('btSheet').innerText; document.getElementById('btSheet').remove(); return t };
          out.bp=part('bpValue'); out.gr=part('grValue'); out.fan=part('fpValue'); out.co=part('fgCoMax'); out.co2=part('fgCo2Min'); out.ratio=part('fgRatioMax'); return out})()""")
        check('no info buttons when the model has no card', r['noneNoCard'] == 0, r)
        check('the model (i) shows the full card', all(t in r['full'] for t in ['Flue Type', 'CH Max Heat Input', 'Max CO2 %', 'Maximum Ratio', 'Maximum CO (ppm)', 'Fan Pressure', 'Min Gas Inlet']), r['full'])
        check('operating pressure shows only the minimum inlet pressure', 'Min Gas Inlet Working Pressure' in r['bp'] and '16.5' in r['bp'] and 'Max CO2' not in r['bp'] and 'Fan Pressure' not in r['bp'], r['bp'])
        check('gas rate shows only the heat input figures', 'CH Max Heat Input' in r['gr'] and '24.62' in r['gr'] and 'CH Min Heat Input' in r['gr'] and 'Min Gas Inlet' not in r['gr'], r['gr'])
        check('fan, CO, CO2 and ratio each show only their own figure', 'Fan Pressure' in r['fan'] and 'Maximum CO (ppm)' not in r['fan'] and 'Maximum CO (ppm)' in r['co'] and 'Max CO2' not in r['co'] and 'Max CO2 %' in r['co2'] and 'Min CO2 %' in r['co2'] and 'Maximum Ratio' in r['ratio'] and 'Maximum CO (ppm)' not in r['ratio'], r)
        check('no page errors with the card tests', not errs, errs)
        ctx.close()

        # ---------- 12am2. combi heat input is the hot-water maximum; gas rate passes 10% under to 5% over ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(()=>{ const f=(m,g)=>BT.find(m,'',g); const a=f('','47-800-32'), v=BT.find('Vaillant','Home Combi 30kW',''), g=BT.find('Glow Worm','Energy c 35kW','');
          return [a.t_hi, v.t_hi, g.t_hi, BT.judge('hi','29.4',a), BT.judge('hi','26.46',a), BT.judge('hi','26.4',a), BT.judge('hi','30.87',a), BT.judge('hi','30.9',a), BT.judge('hi','',a)] })()""")
        check('4000 30kW heat input is 29.4 and the gas rate band is -10% / +5%', r == ['29.4', '30.6', '35.7', True, True, False, True, False, None], r)
        ctx.close()

        # ---------- 12am3. review screen: warning notice prompt gives the reason and a way back ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ qSeed(); const cu={id:'cw',name:'Warn Test',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.warning='YES'; records.push(rec); ui.rec=rec; ui.view='form'; ui.step=7; render(); await new Promise(r=>setTimeout(r,200));
          const t=document.getElementById('view').innerText; const bt=document.querySelector('[data-act=warnGoto]'); bt&&bt.click(); await new Promise(r=>setTimeout(r,200));
          return [t.includes('set to YES on the Finish step'), !!bt, ui.step] })()""")
        check('warning notice prompt says why and jumps back to the Finish step', r == [True, True, 5], r)
        ctx.close()

        # ---------- 12am4. Finish step banner names its reason ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ qSeed(); const cu={id:'cx',name:'Banner Test',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.warning='YES'; records.push(rec); ui.rec=rec; ui.view='form'; ui.step=5; render(); await new Promise(r=>setTimeout(r,200));
          const t=document.querySelector('.notice.err'); return [t&&t.innerText.includes('answered YES'), t&&t.innerText.includes('has failed')] })()""")
        check('Finish banner says a YES answer (not a failure) triggered the notice', r == [True, False], r)
        ctx.close()

        # ---------- 12am5. Greenstar 2000 combi heat input ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(()=>[BT.find('','','47-800-26').t_hi, BT.find('','','47-800-28').t_hi])()""")
        check('Greenstar 2000 combi heat input is the hot-water maximum (25.5 / 30)', r == ['25.5', '30'], r)
        ctx.close()

        # ---------- 12an. the (i) buttons hold still (not rebuilt over and over) ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ qSeed(); const cu={id:'c1',name:'Hold Still',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Greenstar 24Ri'; rec.bpTaken='YES'; ui.rec=rec; ui.view='form'; ui.step=4; render(); await new Promise(r=>setTimeout(r,400));
          return await new Promise(res=>{ let c=0; const o=new MutationObserver(()=>c++); o.observe(document.getElementById('view'),{childList:true,subtree:true}); setTimeout(()=>res(c),1200) }) })()""")
        check('the info buttons are not rebuilt while nothing changes', r == 0, r)
        ctx.close()

        # ---------- 12ao. a second boiler works the same way (template) ----------
        ctx, pg, errs = fresh(b, mobile=True)
        r = ev(pg, """(async()=>{ const out={}; qSeed(); const g=settings.qList.find(x=>x.name==='Greenstar 24Ri');
          const n={id:'nb1',type:'Boiler',make:'Worcester Bosch',name:'Greenstar 30Ri',kind:'Combination',kw:'30',warranty:'',unit:'',cost:'',markup:'',price:''}; settings.qList.push(n); saveSettings();
          ui.view='prices'; ui.pCat='Boiler'; ui.pMake='Worcester Bosch'; ui.pEdit='nb1'; render(); await new Promise(r=>setTimeout(r,150));
          const sel=document.querySelector('[data-btcopy=nb1]'); out.hasCopy=!!sel; sel.value=g.id; sel.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,150));
          out.copied=n.t_co==='200' && n.t_inlet==='16.5' && n.t_co2Tol==='0.5'; out.gcNotCopied=!n.t_gc;
          n.t_gc='41-311-88'; n.t_inlet='17'; saveSettings();
          const cu={id:'c0',name:'Second Model',phone:'',email:'',billing:'',properties:[],updated:1}; customers.push(cu);
          const rec=newRecord(cu,'service'); rec.make='Worcester Bosch'; rec.model='Greenstar 30Ri'; rec.bpTaken='YES'; ui.rec=rec; ui.view='form'; ui.step=4; render(); await new Promise(r=>setTimeout(r,250));
          document.querySelector('.f[data-f=bpValue] .tolI').click(); out.sheet=document.getElementById('btSheet').innerText; return out})()""")
        check('figures can be copied from another boiler (not the GC number)', r['hasCopy'] and r['copied'] and r['gcNotCopied'], r)
        check('a second boiler shows its own figures the same way', 'Greenstar 30Ri' in r['sheet'] and '17' in r['sheet'] and '16.5' not in r['sheet'], r['sheet'])
        check('no page errors with a second boiler', not errs, errs)
        ctx.close()

        # ---------- 12ac. v226 interface changes ----------
        ctx, pg, errs = fresh(b)
        r = ev(pg, """(async()=>{ const out={};
          customers.length=0; records.length=0; bookings.length=0; invoices.length=0;
          const cu={id:'k1',name:'Kim Search',phone:'07700900555',email:'k@x.com',billing:'3 Bill St\\nLincoln\\nLN3 3AA',properties:['5 Prop Rd\\nLincoln\\nLN5 5PR'],updated:1}; customers.push(cu);
          // customer quick row
          ui.cust=JSON.parse(JSON.stringify(cu)); ui.view='custEdit'; render();
          out.qk=document.querySelectorAll('.qkrow .qk').length; out.qkLinks=document.querySelectorAll('.qkrow a.qk').length;
          // search
          const s1=omnSearch('kim'), s2=omnSearch('LN55PR'), s3=omnSearch('0770 090 0555'), s4=omnSearch('zzzz');
          out.s=[s1.customers.length,s2.customers.length,s3.customers.length,s4.customers.length];
          document.getElementById('searchBtn').click(); const inp=document.getElementById('srchIn'); inp.value='kim'; inp.dispatchEvent(new Event('input',{bubbles:true}));
          out.srchRow=!!document.querySelector('#srchOut [data-act=editCust]'); document.getElementById('srchX').click(); await new Promise(r=>setTimeout(r,50));
          out.srchClosed=!document.getElementById('searchSheet');
          // today: next job has Start the forms
          const D=localISO(); bookings.push({id:'t1',date:D,time:'23:00',mins:60,name:'Kim Search',customerId:'k1',address:'5 Prop Rd\\nLincoln\\nLN5 5PR',types:['service'],status:'booked',phone:'07700900555',email:'',auto:false});
          bookings.push({id:'t2',date:D,time:'23:30',mins:30,name:'Second Job',address:'1 Other St\\nLincoln\\nLN1 1AB',types:['gas'],status:'booked',phone:'',email:'',auto:false});
          ui.view='home'; render(); out.startBtn=!!document.querySelector('[data-act=todayStart]'); out.tl=!!document.querySelector('.tl .tlrow');
          // appointment page More menu
          ui.book={...bookings[0]}; ui.view='book'; render(); out.more=!!document.querySelector('details.more'); out.moreClosed=!document.querySelector('details.more').open;
          // auto-advance
          const rec=newRecord(cu,'gas'); records.push(rec); ui.rec=rec; ui.step=2; ui.view='form'; render();
          const fs=[...document.querySelectorAll('.f[data-f]')].filter(e=>e.querySelector('.seg')); out.fcount=fs.length;
          let scrolled=0; Element.prototype.scrollIntoView=function(){ scrolled++; };
          const b1=document.querySelector('.f[data-f=installPipe] button[data-v=Pass]'); b1.click(); await new Promise(r=>setTimeout(r,200)); out.adv1=scrolled;
          const b2=document.querySelector('.f[data-f=installPipe] button[data-v=Fail]'); b2.click(); await new Promise(r=>setTimeout(r,200)); out.adv2=scrolled;
          return out; })()""")
        check('customer has four quick buttons', r['qk'] == 4 and r['qkLinks'] >= 1, r)
        check('search finds customers by name, postcode and phone, and nothing for rubbish', r['s'] == [1, 1, 1, 0], r)
        check('search sheet shows a tappable result and closes', r['srchRow'] and r['srchClosed'], r)
        check('Today next job has Start the forms and a timeline', r['startBtn'] and r['tl'], r)
        check('appointment page has a closed More menu', r['more'] and r['moreClosed'], r)
        check('first answer scrolls to the next question, a changed answer does not', r['adv1'] == 1 and r['adv2'] == 1, r)
        check('no page errors in interface changes', not errs, errs)
        ctx.close()

        # first-time tour shows for an empty account
        ctx, pg, errs = fresh(b)
        ev(pg, "(()=>{ const b=document.createElement('button'); b.dataset.act='tour'; document.body.appendChild(b); b.click(); b.remove(); })()")
        pg.wait_for_selector('#tourBox', timeout=9000)
        n = ev(pg, "(()=>{ document.querySelector('[data-tour=next]').click(); return document.querySelector('#tourBox h2').textContent; })()")
        check('the tour moves on a step', n == 'Start a job', n)
        ev(pg, "document.querySelector('[data-tour=skip]').click()")
        check('skipping the tour closes it and remembers', ev(pg, "!document.getElementById('tourBox') && settings.tourDone==='1'"))
        check('no page errors in the tour', not errs, errs)
        ctx.close()

        # ---------- 13. page security policy: the app runs with it and nothing is blocked ----------
        ctx = b.new_context(viewport={'width': 390, 'height': 800})
        pg = ctx.new_page(); csp = []
        pg.on('console', lambda m: csp.append(m.text[:160]) if 'Content Security Policy' in m.text or 'Refused to' in m.text else None)
        pg.goto(URL); pg.wait_for_timeout(2500)
        check('page has a content security policy that limits scripts to this site', "script-src 'self'" in (pg.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute('content') or ''))
        check('app starts under the security policy (menu drawn)', pg.locator('#nav button').count() >= 5)
        check('theme script (now a file) still sets the theme', pg.locator('html[data-theme]').count() == 1)
        check('nothing blocked by the security policy on start-up', not csp, csp)
        ctx.close()

        b.close()

    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
