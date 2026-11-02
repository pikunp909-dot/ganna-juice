// Translation dictionary — English (en) and Odia (or).
// `or` strings are Odia in Odia script. Fallback is always `en`.

export const DEFAULT_LANG = "en";
export const SUPPORTED_LANGS = ["en", "or"];

export const messages = {
  en: {
    // nav / hero
    orderNow: "Order Now",
    viewMenu: "View Menu",
    menu: "The Menu",
    menuShort: "Menu",
    home: "Home",
    login: "Login",
    contact: "Contact",

    // hero
    heroLine1: "Crushed live.",
    heroLine2: "Golden cold.",
    heroLine3: "Pure ganna.",
    heroSub:
      "Cold-pressed cane juice, squeezed to order at your neighbourhood stall. No added sugar, no shortcuts.",

    // item / cart
    add: "Add",
    cart: "Cart",
    inCart: "in your cart",
    item: "item",
    items: "items",
    viewCart: "View Cart",
    yourCart: "Your Cart",
    cartEmpty: "Cart is empty",
    cartEmptySub: "Add some cold ganna from the menu.",
    subtotal: "Subtotal",
    proceedCheckout: "Proceed to Checkout",
    drawerHint: "Payment via UPI QR — arrives in the next step.",

    // trust badges
    trustNatural: "100% Natural",
    trustNaturalSub: "No syrups, no preservatives",
    trustSugar: "0g Added Sugar",
    trustSugarSub: "Sweetness straight from cane",
    trustCold: "Cold Pressed",
    trustColdSub: "Crushed live, served ice-cold",

    // menu
    menuEyebrow: "Fresh from the kiosk",
    menuSub:
      "Every glass crushed to order. Pick your poison — it'll be cold before you finish reading.",
    retry: "Retry",
    menuEmptyTitle: "Menu is being prepared",
    menuEmptySub: "Items will appear here shortly.",
    fresh: "Fresh",
    itemDescFallback: "Cold pressed, served fresh.",

    // checkout
    checkout: "Checkout",
    name: "Name",
    mobileNumber: "Mobile number",
    delivery: "Delivery",
    pickup: "Pickup",
    payOnline: "Pay Online",
    cashOnDelivery: "Cash on Delivery",
    placeOrder: "Place Order",
    confirmPayment: "Confirm Payment",
    backToDetails: "← Back to details",
    amountToPay: "Amount to pay",
    secureUpi: "Secure UPI payment",

    // success
    orderPlaced: "Order placed",
    paymentRecorded: "Payment recorded",
    continueBrowsing: "Continue browsing",

    // footer
    findUs: "Find us here",
    openInMaps: "Open in Google Maps",
    footerSub:
      "Crushed live, golden cold, pure ganna. Your neighbourhood stall, now one tap away.",
    footerMade: "Cold pressed with ♥ in Bhubaneswar.",

    // reviews
    reviewsEyebrow: "Reviews",
    reviewsTitle: "What customers say",
    reviewsSub: "Real words from the stall, one tap away.",
    rateOnMaps: "Rate us on Google Maps",
    writeReviewTitle: "Write a review",
    reviewNameLabel: "Your name",
    reviewNamePlaceholder: "e.g. Rahul",
    reviewRatingLabel: "Your rating",
    reviewCommentLabel: "Your comment",
    reviewCommentPlaceholder: "How was the juice?",
    reviewSubmit: "Submit review",
    reviewSending: "Submitting…",
    reviewThanks: "Thanks! Your review is live.",
    reviewEmpty: "No reviews yet — be the first!",
    reviewErrName: "Please enter your name",
    reviewErrRating: "Please select a star rating",

    // step 1 details
    deliveryAddress: "Delivery address",
    continueToPayment: "Continue to Payment",
    stepDetails: "Details",
    stepPayment: "Payment",
    stepDone: "Done",

    // validation
    errName: "Please enter your name",
    errPhone: "Enter a valid 10-digit mobile number",
    errAddress: "Address is required for delivery",
    errUtr: "UTR must be exactly 12 digits",

    // payment step
    scanUpi: "Scan with any UPI app (Google Pay, PhonePe, Paytm…)",
    verifyUtr: "Verify payment — UTR number",
    utrPlaceholder: "Enter 12-digit UTR reference",
    utrHint: "Found in your UPI app after payment (e.g. 312987654321)",
    copy: "Copy",
    copied: "Copied",
    upiReceipt: "UPI Digital Receipt",
    liveBadge: "Live",
    orderLabel: "Order",
    newLabel: "New",
    amountPayable: "Amount payable",
    methodLabel: "Method",
    payOnlineSub: "UPI app",
    payAtPickupSub: "Pay at pickup",
    payOnArrival: "Pay when your order arrives",
    cashNote:
      "No online payment needed. Keep cash ready — our team will collect it on delivery.",
    placingOrder: "Placing order…",

    // success
    sendReceipt: "Send receipt on WhatsApp",
    statusConfirmed: "Confirmed",
    statusAwaiting: "Awaiting verification",
    paymentLabel: "Payment",
    statusLabel: "Status",
    successCodSub:
      "Thank you! Your order has been sent to the stall. Keep cash ready — we will confirm shortly.",
    successUpiSub:
      "Thank you! Your order has been sent to the stall. We will confirm once the payment is verified.",

    // whatsapp receipt template
    waHeader: "Namaste! My order {ref} on Sugarcane Juice",
    waTotal: "Total: {total}",
    waConfirm: "Please confirm 🙏",
    waPayCod: "Payment: Cash on Delivery",
    waPayUpi: "Payment UTR: {utr}",

    // track order
    trackEyebrow: "Track Order",
    trackTitle: "Track your order",
    trackSub: "Enter your order ID to see live status.",
    trackPlaceholder: "Order ID (e.g. 24)",
    trackBtn: "Track",
    trackLiveOrder: "Track Live Order",
    trackLoading: "Tracking…",
    trackInvalid: "Enter an order ID first",
    trackNotFound: "Order not found. Check the ID and try again.",
    trackStepPending: "Pending",
    trackStepPreparing: "Preparing",
    trackStepOut: "Out for Delivery",
    trackStepDelivered: "Delivered",
    trackTotal: "Total",
    trackRefresh: "Refreshes automatically every few seconds",

    // misc
    total: "Total"
  },

  or: {
    // nav / hero
    orderNow: "ଏବେ ଅର୍ଡର କରନ୍ତୁ",
    viewMenu: "ମେନୁ ଦେଖନ୍ତୁ",
    menu: "ମେନୁ",
    menuShort: "ମେନୁ",
    home: "ମୁଖ୍ୟ ପୃଷ୍ଠା",
    login: "ଲଗଇନ୍",
    contact: "ଯୋଗାଯୋଗ",

    // hero
    heroLine1: "ତାଜା ଚିପା।",
    heroLine2: "ସୁନା ଥଣ୍ଡା।",
    heroLine3: "ଶୁଦ୍ଧ ଗନ୍ନା।",
    heroSub:
      "ଥଣ୍ଡା ଚାପା ଆଖୁ ରସ, ଆପଣଙ୍କ ପଡ଼ୋଶୀ ଦୋକାନରେ ଅର୍ଡର ଅନୁଯାୟୀ ତାଜା ଚିପା ହୋଇଥାଏ। କୌଣସି ଚିନି ନାହିଁ, କୌଣସି ସର୍ଟକଟ ନାହିଁ।",

    // item / cart
    add: "ଯୋଡନ୍ତୁ",
    cart: "ଟୋକରି",
    inCart: "ଆପଣଙ୍କ ଟୋକରିରେ",
    item: "ଆଇଟମ୍",
    items: "ଆଇଟମ୍",
    viewCart: "କାର୍ଟ ଦେଖନ୍ତୁ",
    yourCart: "ଆପଣଙ୍କ କାର୍ଟ",
    cartEmpty: "କାର୍ଟ ଖାଲି ଅଛି",
    cartEmptySub: "ମେନୁରୁ କିଛି ଥଣ୍ଡା ଗନ୍ନା ଯୋଡନ୍ତୁ।",
    subtotal: "ସବ୍ଟୋଟାଲ",
    proceedCheckout: "ଚେକ୍ଆଉଟକୁ ଆଗକୁ ଯାଆନ୍ତୁ",
    drawerHint: "ପେମେଣ୍ଟ UPI QR ମାଧ୍ୟମରେ — ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପରେ।",

    // trust badges
    trustNatural: "୧୦୦% ପ୍ରାକୃତିକ",
    trustNaturalSub: "କୌଣସି ସିରପ୍ ନାହିଁ, କୌଣସି ପ୍ରିଜରଭେଟିଭ ନାହିଁ",
    trustSugar: "୦ଗ୍ରାମ ୟୋଡ଼ା ଚିନି",
    trustSugarSub: "ମିଠାପଣ ସିଧା ଆଖୁରୁ",
    trustCold: "ଥଣ୍ଡା ଚାପା",
    trustColdSub: "ତାଜା ଚିପା, ବରଫ ଥଣ୍ଡା ସର୍ଭ",

    // menu
    menuEyebrow: "କିଓସ୍କରୁ ତାଜା",
    menuSub:
      "ପ୍ରତ୍ୟେକ ଗ୍ଲାସ ଅର୍ଡର ଅନୁଯାୟୀ ଚିପା ହୋଇଥାଏ। ଆପଣଙ୍କ ପସନ୍ଦ ବାଛନ୍ତୁ — ପଢ଼ି ସାରିବା ପୂର୍ବରୁ ଏହା ଥଣ୍ଡା ହୋଇଯିବ।",
    retry: "ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ",
    menuEmptyTitle: "ମେନୁ ପ୍ରସ୍ତୁତ ହେଉଛି",
    menuEmptySub: "ଆଇଟମ୍ ଶୀଘ୍ର ଦେଖାଯିବ।",
    fresh: "ତାଜା",
    itemDescFallback: "ଥଣ୍ଡା ଚାପା, ତାଜା ସର୍ଭ।",

    // checkout
    checkout: "ଚେକ୍ଆଉଟ",
    name: "ନାମ",
    mobileNumber: "ମୋବାଇଲ ନମ୍ବର",
    delivery: "ଡେଲିଭେରି",
    pickup: "ଉଠାଇ ନେବା",
    payOnline: "ଅନଲାଇନ ପେମେଣ୍ଟ",
    cashOnDelivery: "କ୍ୟାଶ ଅନ ଡେଲିଭେରି",
    placeOrder: "ଅର୍ଡର ରଖନ୍ତୁ",
    confirmPayment: "ପେମେଣ୍ଟ ନିଶ୍ଚିତ କରନ୍ତୁ",
    backToDetails: "← ବିବରଣୀକୁ ଫେରନ୍ତୁ",
    amountToPay: "ଦେୟ ରାଶି",
    secureUpi: "ସୁରକ୍ଷିତ UPI ପେମେଣ୍ଟ",

    // success
    orderPlaced: "ଅର୍ଡର ରଖାଯାଇଛି",
    paymentRecorded: "ପେମେଣ୍ଟ ରେକର୍ଡ ହୋଇଛି",
    continueBrowsing: "ଆଗକୁ ବ୍ରାଉଜ କରନ୍ତୁ",

    // footer
    findUs: "ଆମକୁ ଏଠାରେ ଖୋଜନ୍ତୁ",
    openInMaps: "ଗୁଗୁଲ ମ୍ୟାପରେ ଖୋଲନ୍ତୁ",
    footerSub:
      "ତାଜା ଚିପା, ସୁନା ଥଣ୍ଡା, ଶୁଦ୍ଧ ଗନ୍ନା। ଆପଣଙ୍କ ପଡ଼ୋଶୀ ଦୋକାନ, ବର୍ତ୍ତମାନ ଗୋଟିଏ ଟାପରେ।",
    footerMade: "ଭୁବନେଶ୍ୱରରେ ♥ ସହିତ ଥଣ୍ଡା ଚାପା।",

    // reviews
    reviewsEyebrow: "ସମୀକ୍ଷା",
    reviewsTitle: "ଗ୍ରାହକ କ'ଣ କୁହନ୍ତି",
    reviewsSub: "ଷ୍ଟଲର ଅସଲି କଥା, ଗୋଟିଏ ଟାପରେ।",
    rateOnMaps: "ଗୁଗୁଲ ମ୍ୟାପରେ ରେଟିଂ ଦିଅନ୍ତୁ",
    writeReviewTitle: "ଏକ ସମୀକ୍ଷା ଲେଖନ୍ତୁ",
    reviewNameLabel: "ଆପଣଙ୍କ ନାମ",
    reviewNamePlaceholder: "ଉଦାହରଣ: ରାହୁଲ",
    reviewRatingLabel: "ଆପଣଙ୍କ ରେଟିଂ",
    reviewCommentLabel: "ଆପଣଙ୍କ ମତାମତ",
    reviewCommentPlaceholder: "ଜୁସ୍ କେମିତି ଥିଲା?",
    reviewSubmit: "ସମୀକ୍ଷା ଦାଖଲ କରନ୍ତୁ",
    reviewSending: "ଦାଖଲ ହେଉଛି…",
    reviewThanks: "ଧନ୍ୟବାଦ! ଆପଣଙ୍କ ସମୀକ୍ଷା ଲାଇଭ ହୋଇଗଲା।",
    reviewEmpty: "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ସମୀକ୍ଷା ନାହିଁ — ପ୍ରଥମ ବ୍ୟକ୍ତି ହୁଅନ୍ତୁ!",
    reviewErrName: "ଦୟାକରି ଆପଣଙ୍କ ନାମ ଦିଅନ୍ତୁ",
    reviewErrRating: "ଦୟାକରି ଏକ ଷ୍ଟାର ରେଟିଂ ବାଛନ୍ତୁ",

    // step 1 details
    deliveryAddress: "ଡେଲିଭେରି ଠିକଣା",
    continueToPayment: "ପେମେଣ୍ଟକୁ ଆଗକୁ ଯାଆନ୍ତୁ",
    stepDetails: "ବିବରଣୀ",
    stepPayment: "ପେମେଣ୍ଟ",
    stepDone: "ସର୍ବ",

    // validation
    errName: "ଦୟାକରି ଆପଣଙ୍କ ନାମ ଦିଅନ୍ତୁ",
    errPhone: "ଏକ ବୈଧ ୧୦ ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ ନମ୍ବର ଦିଅନ୍ତୁ",
    errAddress: "ଡେଲିଭେରି ପାଇଁ ଠିକଣା ଆବଶ୍ୟକ",
    errUtr: "UTR ଠିକ୍ ୧୨ ଅଙ୍କ ହେବା ଉଚିତ",

    // payment step
    scanUpi: "କୌଣସି UPI ଆପ୍ ସହିତ ସ୍କାନ କରନ୍ତୁ (Google Pay, PhonePe, Paytm…)",
    verifyUtr: "ପେମେଣ୍ଟ ଯାଞ୍ଚ କରନ୍ତୁ — UTR ନମ୍ବର",
    utrPlaceholder: "୧୨ ଅଙ୍କ ବିଶିଷ୍ଟ UTR ରେଫରେନ୍ସ ଦିଅନ୍ତୁ",
    utrHint: "ପେମେଣ୍ଟ ପରେ ଆପଣଙ୍କ UPI ଆପ୍ରେ ମିଳିଥାଏ (ଉଦାହରଣ: 312987654321)",
    copy: "କପି",
    copied: "କପି ହେଲା",
    upiReceipt: "UPI ଡିଜିଟାଲ ରିସିଟ",
    liveBadge: "ଲାଇଭ୍",
    orderLabel: "ଅର୍ଡର",
    newLabel: "ନୂତନ",
    amountPayable: "ଦେୟ ରାଶି",
    methodLabel: "ପଦ୍ଧତି",
    payOnlineSub: "UPI ଆପ୍",
    payAtPickupSub: "ଉଠାଇ ନେବା ସମୟରେ ଦିଅନ୍ତୁ",
    payOnArrival: "ଆପଣଙ୍କ ଅର୍ଡର ପହଞ୍ଚିଲେ ପେମେଣ୍ଟ କରନ୍ତୁ",
    cashNote:
      "କୌଣସି ଅନଲାଇନ ପେମେଣ୍ଟ ଦରକାର ନାହିଁ। ନଗଦ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ — ଆମ ଟିମ୍ ଡେଲିଭେରି ସମୟରେ ସଂଗ୍ରହ କରିବ।",
    placingOrder: "ଅର୍ଡର ରଖୁଛୁ…",

    // success
    sendReceipt: "WhatsApp ରେ ରିସିଟ ପଠାନ୍ତୁ",
    statusConfirmed: "ନିଶ୍ଚିତ",
    statusAwaiting: "ଯାଞ୍ଚ ଅପେକ୍ଷାରେ",
    paymentLabel: "ପେମେଣ୍ଟ",
    statusLabel: "ସ୍ଥିତି",
    successCodSub:
      "ଧନ୍ୟବାଦ! ଆପଣଙ୍କ ଅର୍ଡର ଦୋକାନକୁ ପଠାଯାଇଛି। ନଗଦ ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ — ଆମେ ଶୀଘ୍ର ନିଶ୍ଚିତ କରିବୁ।",
    successUpiSub:
      "ଧନ୍ୟବାଦ! ଆପଣଙ୍କ ଅର୍ଡର ଦୋକାନକୁ ପଠାଯାଇଛି। ପେମେଣ୍ଟ ଯାଞ୍ଚ ହେବା ପରେ ଆମେ ନିଶ୍ଚିତ କରିବୁ।",

    // whatsapp receipt template
    waHeader: "ନମସ୍କାର! ମୋ ଅର୍ଡର {ref} ଗନ୍ନା ପ୍ଲେଟରେ",
    waTotal: "ମୋଟ: {total}",
    waConfirm: "ଦୟାକରି ନିଶ୍ଚିତ କରନ୍ତୁ 🙏",
    waPayCod: "ପେମେଣ୍ଟ: କ୍ୟାଶ ଅନ ଡେଲିଭେରି",
    waPayUpi: "ପେମେଣ୍ଟ UTR: {utr}",

    // track order
    trackEyebrow: "ଅର୍ଡର ଟ୍ରାକ୍",
    trackTitle: "ଆପଣଙ୍କ ଅର୍ଡର ଟ୍ରାକ୍ କରନ୍ତୁ",
    trackSub: "ଆପଣଙ୍କ ଅର୍ଡର ID ଦିଅନ୍ତୁ, ଲାଇଭ୍ ସ୍ଥିତି ଦେଖନ୍ତୁ।",
    trackPlaceholder: "ଅର୍ଡର ID (e.g. 24)",
    trackBtn: "ଟ୍ରାକ୍",
    trackLiveOrder: "ଲାଇଭ୍ ଅର୍ଡର ଟ୍ରାକ୍ କରନ୍ତୁ",
    trackLoading: "ଟ୍ରାକ୍ ହେଉଛି…",
    trackInvalid: "ପ୍ରଥମେ ଅର୍ଡର ID ଦିଅନ୍ତୁ",
    trackNotFound: "ଅର୍ଡର ମିଳିଲା ନାହିଁ। ID ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।",
    trackStepPending: "ବାକି",
    trackStepPreparing: "ପ୍ରସ୍ତୁତ ହେଉଛି",
    trackStepOut: "ଡେଲିଭରୀରେ",
    trackStepDelivered: "ଡେଲିଭରୀ ହୋଇଛି",
    trackTotal: "ମୋଟ",
    trackRefresh: "ପ୍ରତି କିଛି ସେକେଣ୍ଡରେ ଅଟୋ ରିଫ୍ରେସ୍ ହେଉଛି",

    // misc
    total: "ମୋଟ"
  }
};

/** Translate a key for a language, with English fallback. */
export function translate(lang, key) {
  const dict = messages[lang] || messages[DEFAULT_LANG];
  return dict[key] !== undefined ? dict[key] : messages[DEFAULT_LANG][key];
}
