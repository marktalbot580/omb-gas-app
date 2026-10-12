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
    ctx = browser.new_context(viewport={'width': 390, 'height': 800}, accept_downloads=True,
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
        for t in ['business', 'invoicing', 'quotes', 'reminders', 'calendar', 'tools', 'app']:
            ok = ev(pg, f"(()=>{{ui.view='settings';ui.sTab='{t}';render();const d=document.querySelector('[data-stab={t}]');return !!d&&!d.hidden&&d.innerText.length>10}})()")
            check(f'settings tab shows: {t}', ok)
        only = ev(pg, "(()=>{ui.view='settings';ui.sTab='invoicing';render();return [...document.querySelectorAll('[data-stab]')].filter(d=>!d.hidden).length})()")
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
        pg.click('[data-act=newRec][data-type=gas]')
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
        ev(pg, "const q=newRecord(null,'quote');q.status='complete';q.qStatus='';q.inspectionDate='2000-01-01';q.customer={name:'Ann Lee',phone:'07700900111',email:'a@x.com'};records.push(q)")
        check('old unanswered quote needs chasing', ev(pg, "records.filter(qChase).length===1"))
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
        pg.click('[data-act=newRec][data-type=gas]'); pg.click('[data-act=bookFromPick]')
        check('Schedule in opens the booking form with the job ticked', ev(pg, "ui.view==='book' && ui.book.types.join()==='gas'"))
        pg.click('[data-bk=name]'); pg.keyboard.type('jan', delay=20)
        check('customer search suggests matches', ev(pg, "document.querySelectorAll('#bkNameSug .cpick').length===2"))
        pg.fill('[data-bk=name]', 'Jane Sm'); pg.dispatch_event('[data-bk=name]', 'input')
        pg.click('#bkNameSug .cpick')
        check('picking a customer fills the details', ev(pg, "ui.book.customerId==='c1' && ui.book.phone==='07700 900123'"))
        check('address list offered with an add-new option', ev(pg, "[...document.querySelectorAll('select[data-bk=propPick] option')].some(o=>o.value==='__new')"))
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
        pg.click('[data-act=newRec][data-type=gas]')
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
          const rec=records.find(x=>typeOf(x)==='service'); rec.status='complete'; rec.inspectionDate=localISO(); rec.renewal=addDays(localISO(),10); rec.customerId=''; persistRec(rec);
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
        ev(pg, "document.querySelector('[data-act=newRec][data-type=gquote]').click()")
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
        ev(pg, "SAMPLE.add(); const r=records.find(x=>typeOf(x)==='service'); r.status='complete'; r.inspectionDate=localISO(); r.renewal=addDays(localISO(),10); persistRec(r); ui.view='home'; render()")
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
        ev(pg, "ui.pick={types:{gquote:true},customer:null}; startJob(); ui.rec.title='Bathroom installation'; ui.rec.scope='Strip out\\nFit suite'; ui.rec.status='complete'; persistRec(ui.rec); ui.pick={types:{gquote:true},customer:null}; startJob(); ui.step=1; render()")
        n = ev(pg, "document.querySelectorAll('[data-qprev] option').length")
        pg.select_option('[data-qprev]', index=1)
        pg.wait_for_timeout(200)
        r = ev(pg, "[ui.rec.title, ui.rec.scope]")
        check('previous job list brings in the title and what is included', n == 2 and r == ['Bathroom installation', 'Strip out\nFit suite'], [n, r])
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

        b.close()

    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
