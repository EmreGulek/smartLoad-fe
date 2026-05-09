# Uygulama Notlari

## 2026-05-09

### Prompt
- "olusturmus oldugumuz auth yapisini artik frontend ile birlikte de kullanmak istiyorum. uygulamanin oncelikle auth islemlerinin yapildigi bir baslangic sayfasi olmasini istiyorum. attigim gorseldeki gibi bir yapi."
- "uygula. bu prompt ile birlikte uyguladigin seyleri not al"

### Uygulananlar
- Login-first routing yapisi eklendi: `/login` public, uygulama sayfalari `ProtectedRoute` arkasina alindi.
- `zustand` ile `authStore` eklendi ve token/user bilgisi `localStorage` uzerinden kalici hale getirildi.
- `axios` tarafina request/response interceptor eklendi:
  - Token varsa her istekte `Authorization: Bearer ...`
  - `401` durumunda local auth temizligi ve `/login` yonlendirmesi
- Yeni `LoginPage` olusturuldu ve backend endpointi ile baglandi:
  - `POST /api/auth/login`
  - Basarili giriste store set edilip ana sayfaya yonlendirme
  - Hata durumunda backend mesaji kullaniciya gosterimi
- Ust navbar'a aktif kullanici e-posta bilgisi ve `Cikis` aksiyonu eklendi.
- Login sayfasi icin gorsel katmanli arka plan ve kart stili eklendi.
- Saglanan gorsellerden biri `public/images/login-background.jpg` olarak tasindi.
- Frontend `.env.example` icindeki backend sirri ile ilgili satir kaldirildi (`JWT_SECRET_KEY` frontendde tutulmuyor).

### Ek Guncelleme (sag ust + uye ol + kod dogrulama)
- Login karti ekranin sag ust bolgesine hizalandi (dikey merkezden cikartildi).
- `LoginPage` icine 3 gorunum eklendi:
  - `Giris Yap`
  - `Uye Ol` (`POST /auth/signup`)
  - `Kod` / `Hesap Dogrula` (`POST /auth/verify`)
- Kod gelmediginde ayni ekrandan tekrar kod gonderme eklendi (`POST /auth/resend?email=...`).
- Kayit basarili oldugunda otomatik olarak kod dogrulama gorunumune gecis yapildi.
