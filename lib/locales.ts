/**
 * lib/locales.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Public Storefront & Checkout i18n Translation Dictionary
 * Supporting Arabic (ar), Turkish (tr), and English (en)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface LocaleDictionary {
  dir: "rtl" | "ltr";
  langCode: "ar" | "tr" | "en";
  langName: string;
  searchPlaceholder: string;
  categories: string;
  categoryAll: string;
  categoryNone: string;
  addToCart: string;
  cart: string;
  total: string;
  customerName: string;
  customerNamePlaceholder: string;
  phoneNumber: string;
  phoneNumberPlaceholder: string;
  deliveryAddress: string;
  deliveryAddressPlaceholder: string;
  sendInvoice: string;
  billingTitle: string;
  product: string;
  quantity: string;
  emptyCart: string;
  emptyCartDesc: string;
  backToStore: string;
  nameRequired: string;
  nameTooShort: string;
  phoneRequired: string;
  phoneInvalid: string;
  submitting: string;
  successTitle: string;
  successDesc: string;
  orderNumber: string;
  waAutoOpen: string;
  waTruncatedWarning: string;
  openWhatsApp: string;
  trustNote: string;
  noProducts: string;
  piece: string;
  noImage: string;
  dukkanniPromo: string;
  dukkanniPromoLink: string;
  uncategorized: string;
  catalogLabel: string;
  itemCount: string;
  itemsCount: string;
  checkoutBtn: string;
  invoiceHeading: string;
  waMessageHeader: string;
  waMessageTotal: string;
  waMessageCustomer: string;
  waMessageTruncated: string;
  selectOptionPrompt: string;
  optionsModalHeading: string;
  optionsConfirmBtn: string;
}

export const locales: Record<"ar" | "tr" | "en", LocaleDictionary> = {
  ar: {
    dir: "rtl",
    langCode: "ar",
    langName: "العربية",
    searchPlaceholder: "البحث عن منتج...",
    categories: "الفئات",
    categoryAll: "الكل",
    categoryNone: "لا توجد منتجات",
    addToCart: "إضافة للسلة",
    cart: "سلة التسوق",
    total: "الإجمالي",
    customerName: "اسم الزبون",
    customerNamePlaceholder: "أدخل اسمك الكريم",
    phoneNumber: "رقم الهاتف",
    phoneNumberPlaceholder: "مثال: +905321234567",
    deliveryAddress: "عنوان التوصيل",
    deliveryAddressPlaceholder: "أدخل عنوان التوصيل بالتفصيل",
    sendInvoice: "إرسال الفاتورة وتأكيد الطلب عبر واتساب",
    billingTitle: "عرض فاتورتك 🧾",
    product: "المنتج",
    quantity: "الكمية",
    emptyCart: "السلة فارغة",
    emptyCartDesc: "أضف منتجات أولاً من المتجر",
    backToStore: "العودة للمتجر",
    nameRequired: "اسم الزبون مطلوب",
    nameTooShort: "الاسم قصير جداً",
    phoneRequired: "رقم الهاتف مطلوب",
    phoneInvalid: "رقم الهاتف غير صحيح (مثال: +905321234567)",
    submitting: "جاري إرسال طلبك...",
    successTitle: "تم إنشاء طلبك بنجاح!",
    successDesc: "واتساب يفتح تلقائياً لإرسال طلبك.",
    orderNumber: "رقم الطلب",
    waAutoOpen: "واتساب يفتح تلقائياً لإرسال طلبك.",
    waTruncatedWarning: "⚠️ الطلب كبير — تم اختصار الرسالة تلقائياً. سيظهر إجمالي السعر الصحيح في الرسالة.",
    openWhatsApp: "فتح واتساب وإرسال الطلب",
    trustNote: "🔒 بضغط الزر، سيُحفظ طلبك وسيفتح واتساب تلقائياً لإرسال الطلب للمتجر",
    noProducts: "لا توجد منتجات في هذه الفئة حالياً",
    piece: "القطعة",
    noImage: "لا توجد صورة",
    dukkanniPromo: "تريد متجراً مشابهاً؟",
    dukkanniPromoLink: "أنشئ متجرك مع دكاني ⚡",
    uncategorized: "غير مصنف",
    catalogLabel: "كتالوج تجاري ⚡",
    itemCount: "منتج واحد",
    itemsCount: "منتجات",
    checkoutBtn: "إتمام الطلب عبر واتساب ←",
    invoiceHeading: "عرض فاتورتك 🧾",
    waMessageHeader: "طلب جديد من متجر: {storeName} 🏪",
    waMessageTotal: "الإجمالي: {total} {symbol}",
    waMessageCustomer: "اسم الزبون: {customerName}",
    waMessageTruncated: "⚠️ +منتجات أخرى (الطلب طويل جداً للاختصار في واتساب)",
    selectOptionPrompt: "اختر {optionName}",
    optionsModalHeading: "تخصيص خيارات طلبك 💎",
    optionsConfirmBtn: "إضافة للسلة بـ {price} {symbol} ←",
  },
  tr: {
    dir: "ltr",
    langCode: "tr",
    langName: "Türkçe",
    searchPlaceholder: "Ürün ara...",
    categories: "Kategoriler",
    categoryAll: "Hepsi",
    categoryNone: "Ürün bulunamadı",
    addToCart: "Sepete Ekle",
    cart: "Alışveriş Sepeti",
    total: "Toplam",
    customerName: "Müşteri Adı",
    customerNamePlaceholder: "Adınızı ve soyadınızı girin",
    phoneNumber: "Telefon Numarası",
    phoneNumberPlaceholder: "Örn: +905321234567",
    deliveryAddress: "Teslimat Adresi",
    deliveryAddressPlaceholder: "Açık teslimat adresinizi girin",
    sendInvoice: "Faturayı Gönder ve WhatsApp ile Siparişi Tamamla",
    billingTitle: "Faturanız 🧾",
    product: "Ürün",
    quantity: "Miktar",
    emptyCart: "Sepetiniz Boş",
    emptyCartDesc: "Lütfen önce mağazadan ürün ekleyin",
    backToStore: "Mağazaya Dön",
    nameRequired: "Müşteri adı zorunludur",
    nameTooShort: "Ad çok kısa",
    phoneRequired: "Telefon numarası zorunludur",
    phoneInvalid: "Geçersiz telefon numarası (Örn: +905321234567)",
    submitting: "Siparişiniz gönderiliyor...",
    successTitle: "Siparişiniz başarıyla oluşturuldu!",
    successDesc: "Siparişinizi göndermek için WhatsApp otomatik olarak açılıyor.",
    orderNumber: "Sipariş Numarası",
    waAutoOpen: "WhatsApp otomatik olarak açılıyor.",
    waTruncatedWarning: "⚠️ Sipariş çok büyük — mesaj otomatik olarak kısaltıldı. Doğru toplam tutar mesajda görünecektir.",
    openWhatsApp: "WhatsApp'ı Aç ve Siparişi Gönder",
    trustNote: "🔒 Butona tıkladığınızda siparişiniz kaydedilecek ve mağaza ile iletişime geçmek için WhatsApp otomatik olarak açılacaktır",
    noProducts: "Bu kategoride şu anda ürün bulunmamaktadır",
    piece: "Adet",
    noImage: "Görsel Yok",
    dukkanniPromo: "Benzer bir mağaza ister misiniz?",
    dukkanniPromoLink: "Dukkanni ile mağazanızı oluşturun ⚡",
    uncategorized: "Kategorisiz",
    catalogLabel: "Ticari Katalog ⚡",
    itemCount: "1 Ürün",
    itemsCount: "Ürün",
    checkoutBtn: "Siparişi WhatsApp ile Tamamla ←",
    invoiceHeading: "Faturanız 🧾",
    waMessageHeader: "Merhaba, {storeName} mağazasından yeni sipariş 🏪",
    waMessageTotal: "Toplam: {total} {symbol}",
    waMessageCustomer: "Müşteri Adı: {customerName}",
    waMessageTruncated: "⚠️ +daha fazla ürün (sipariş WhatsApp önizlemesi için çok uzun)",
    selectOptionPrompt: "{optionName} Seçin",
    optionsModalHeading: "Sipariş Seçeneklerini Belirleyin 💎",
    optionsConfirmBtn: "Sepete Ekle - {price} {symbol} ←",
  },
  en: {
    dir: "ltr",
    langCode: "en",
    langName: "English",
    searchPlaceholder: "Search for a product...",
    categories: "Categories",
    categoryAll: "All",
    categoryNone: "No products found",
    addToCart: "Add to Cart",
    cart: "Shopping Cart",
    total: "Total",
    customerName: "Customer Name",
    customerNamePlaceholder: "Enter your full name",
    phoneNumber: "Phone Number",
    phoneNumberPlaceholder: "e.g., +905321234567",
    deliveryAddress: "Delivery Address",
    deliveryAddressPlaceholder: "Enter your detailed delivery address",
    sendInvoice: "Send Invoice & Confirm Order via WhatsApp",
    billingTitle: "Your Invoice 🧾",
    product: "Product",
    quantity: "Quantity",
    emptyCart: "Your Cart is Empty",
    emptyCartDesc: "Please add some products from the store first",
    backToStore: "Back to Store",
    nameRequired: "Customer name is required",
    nameTooShort: "Name is too short",
    phoneRequired: "Phone number is required",
    phoneInvalid: "Invalid phone number (e.g., +905321234567)",
    submitting: "Submitting your order...",
    successTitle: "Your order was successfully created!",
    successDesc: "WhatsApp will open automatically to send your order.",
    orderNumber: "Order Number",
    waAutoOpen: "Opening WhatsApp automatically.",
    waTruncatedWarning: "⚠️ Order is large — the message has been automatically truncated. The correct total will be visible in the message.",
    openWhatsApp: "Open WhatsApp & Send Order",
    trustNote: "🔒 Clicking this button saves your order and automatically opens WhatsApp to contact the store",
    noProducts: "No products in this category currently",
    piece: "Piece",
    noImage: "No Image",
    dukkanniPromo: "Want a similar store?",
    dukkanniPromoLink: "Create your store with Dukkanni ⚡",
    uncategorized: "Uncategorized",
    catalogLabel: "Commercial Catalog ⚡",
    itemCount: "1 Item",
    itemsCount: "Items",
    checkoutBtn: "Complete Order via WhatsApp ←",
    invoiceHeading: "Your Invoice 🧾",
    waMessageHeader: "New order from store: {storeName} 🏪",
    waMessageTotal: "Total: {total} {symbol}",
    waMessageCustomer: "Customer Name: {customerName}",
    waMessageTruncated: "⚠️ +more items (order too long for WhatsApp preview)",
    selectOptionPrompt: "Select {optionName}",
    optionsModalHeading: "Select Product Options 💎",
    optionsConfirmBtn: "Add to Cart - {price} {symbol} ←",
  },
};
