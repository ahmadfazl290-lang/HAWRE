import { useI18n, Message, LanguageSelector } from "../i18n/LocaleProvider.jsx";
export default function Settings({
  preferences,
  setPreferences,
  exportBackup,
  onImport,
  deleteEverything
}) {
  const {
    t,
    direction,
    locale
  } = useI18n();
  return <div className="stack"><section className="panel"><LanguageSelector /><h2><Message source="خوێندنەوەی ئاسانتر" /></h2><label className="check-label"><Message source="{p0}نووسینی گەورەتر" values={{
          p0: <input type="checkbox" checked={preferences.largeText} onChange={e => setPreferences(p => ({
            ...p,
            largeText: e.target.checked
          }))} />
        }} /></label><label className="check-label"><Message source="{p0}دۆخی تاریک" values={{
          p0: <input type="checkbox" checked={preferences.dark} onChange={e => setPreferences(p => ({
            ...p,
            dark: e.target.checked
          }))} />
        }} /></label></section><section className="panel"><h2><Message source="پاشەکەوت و گواستنەوە" /></h2><p><Message source="هەموو وەڵام، پلان و ڕاهێنانەکان لەم وێبگەڕە دەپارێزرێن. فایلێکی پاشەکەوت دابگرە بۆ گواستنەوە یان پاراستن." /></p><p className="info-note"><Message source="پاشەکەوتەکە زانیارییە کەسییەکانت دەگرێتەوە و کۆدکراو نییە. لە ئامێری هاوبەشدا کەسێکی تر دەتوانێت زانیارییەکان ببینێت." /></p><div className="action-row"><button className="btn btn-primary" onClick={exportBackup}><Message source="داگرتنی هەموو زانیارییەکان" /></button><button className="btn btn-secondary" onClick={onImport}><Message source="گەڕاندنەوە لە فایل" /></button></div></section><section className="panel"><h2><Message source="نهێنی و شێوازی کارکردن" /></h2><ul className="privacy-list"><li><Message source="هەژمار، ڕیکلام، چاودێریکردن و ناردنی خۆکاری زانیاری بۆ سێرڤەر نییە." /></li><li><Message source="هاوبەشکردن تەنها بە هەڵبژاردنی خۆتە؛ ناو و وەڵامەکان بە بنەڕەت هەڵنەبژێردراون." /></li><li><Message source="بەشی پشتگیری چاودێری ناکرێت و هیچ نامەیەک خۆکار بۆ کەسێک نانێردرێت." /></li><li><Message source="دوای یەکەم باربوونی وەشانی بەرهەمهێنراو، پلاتفۆرمەکە بەبێ ئینتەرنێتیش کار دەکات." /></li><li><Message source="پرسیارەکانی فێربوون نموونەی گشتین؛ پێویستیان بە پشکنینی مامۆستا هەیە پێش بەکارهێنان بۆ بەرنامەی قوتابخانە." /></li><li><Message source="نیشاندەرەکانی عادەت یاسایەکی ڕوونی ناوخۆیین، پێوانەی پزیشکی یان پێوانەی توانای قوتابی نین." /></li></ul></section><section className="panel danger-panel"><h2><Message source="سڕینەوەی زانیارییەکان" /></h2><p><Message source="تەنها زانیارییەکانی هاوڕێ لەم وێبگەڕە دەسڕدرێنەوە." /></p><button className="btn btn-danger" onClick={deleteEverything}><Message source="سڕینەوەی هەموو زانیارییەکانم" /></button></section></div>;
}
