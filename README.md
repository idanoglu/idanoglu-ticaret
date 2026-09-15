# İDANOĞLU TİCARET Online CRM

Bu proje gerçek online kullanım için Next.js + Supabase ile hazırlanmıştır.

1. Supabase'de ücretsiz proje açın.
2. `supabase/schema.sql` dosyasını SQL Editor'de çalıştırın.
3. Authentication > Users > Add user ile ilk e-posta/şifre hesabını oluşturun.
4. Project Settings > API'den URL ve anon key alın; `.env.local` içine yazın.
5. `npm install` ardından `npm run dev`.
6. GitHub'a yükleyip Vercel'e Import ederek internete yayınlayın. Vercel'de iki NEXT_PUBLIC_* değişkenini ekleyin.

Veriler Supabase'de tutulur; aynı hesapla telefon ve bilgisayardan aynı stok/sipariş verisi görülür. Sipariş oluşturma stok düşümünü veritabanı transaction'ı içinde yapar ve alış fiyatını sipariş kaleminde saklar.
