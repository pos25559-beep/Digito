// Fontes da página "Porquê" — a ordem define a numeração [n].
// Todas verificadas em 29/10/2026. Números citados na página saem destas fontes.
export const SOURCES = [
  { id: 'who', cite: 'OMS e UNICEF (2022). Global report on assistive technology. Comunicado de imprensa, 16 de maio de 2022.', url: 'https://www.who.int/news-room/releases/16-05-2022-almost-one-billion-children-and-adults-with-disabilities-and-older-persons-in-need-of-assistive-technology-denied-access--according-to-new-report' },
  { id: 'phillips', cite: 'Phillips, B. e Zhao, H. (1993). Predictors of assistive technology abandonment. Assistive Technology, 5(1).', url: 'https://doi.org/10.1080/10400435.1993.10132205' },
  { id: 'louis', cite: 'Louis, E. D. e Ferreira, J. J. (2010). How common is the most common adult movement disorder? Update on the worldwide prevalence of essential tremor. Movement Disorders, 25(5).', url: 'https://doi.org/10.1002/mds.22838' },
  { id: 'whopd', cite: 'OMS. Parkinson disease, ficha informativa.', url: 'https://www.who.int/news-room/fact-sheets/detail/parkinson-disease' },
  { id: 'whooa', cite: 'OMS. Osteoarthritis, ficha informativa.', url: 'https://www.who.int/news-room/fact-sheets/detail/osteoarthritis' },
  { id: 'buehler', cite: 'Buehler, E. et al. (2015). Sharing is caring: assistive technology designs on Thingiverse. CHI ’15, ACM, 525–534.', url: 'https://doi.org/10.1145/2702123.2702525' },
  { id: 'mmc', cite: 'Neil Squire Society (2026). A decade of impact: Makers Making Change celebrates 10 years.', url: 'https://www.neilsquire.ca/a-decade-of-impact-neil-squires-makers-making-change-program-celebrates-10-years/' },
  { id: 'colvenkar', cite: 'Colvenkar, S. et al. (2022). Individually modeled 3D printed toothbrush and interproximal brush handle for patients with limited manual dexterity. Cureus (resumo na Dental Tribune).', url: 'https://www.dental-tribune.com/news/researchers-develop-customised-3d-printed-toothbrush-handle-for-patients-with-limited-dexterity/' },
  { id: 'hofmann', cite: 'Hofmann, M. et al. (2019). “Occupational therapy is making”: clinical rapid prototyping and digital fabrication. CHI ’19, ACM.', url: 'https://par.nsf.gov/servlets/purl/10113183' },
  { id: 'ortho', cite: 'Economic evaluation of the manufacturing of 3D-printed wrist orthoses vs low temperature thermoplastic wrist orthoses (2025). 3D Printing in Medicine.', url: 'https://opedge.com/study-compares-3d-printed-thermoplastic-orthoses-costs/' },
  { id: 'mdcg', cite: 'Comissão Europeia, MDCG 2021-3 (2021). Questions and answers on custom-made devices.', url: 'https://www.hibcc.org/wp-content/uploads/mdcg_2021-3_en.pdf' },
  { id: 'hoober', cite: 'Hoober, S. (2013). How do users really hold mobile devices? UXmatters.', url: 'https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php' },
  { id: 'bergstrom', cite: 'Bergstrom-Lehtovirta, J. e Oulasvirta, A. (2014). Modeling the functional area of the thumb on mobile touchscreen surfaces. CHI ’14, ACM, 1991–2000.', url: 'https://doi.org/10.1145/2556288.2557354' },
  { id: 'zirek', cite: 'Zirek, E., Mustafaoglu, R., Yasaci, Z. e Griffiths, M. D. (2020). A systematic review of musculoskeletal complaints, symptoms, and pathologies related to mobile phone usage. Musculoskeletal Science and Practice, 49, 102196.', url: 'https://irep.ntu.ac.uk/id/eprint/40071' },
  { id: 'acou', cite: 'Laput, G., Brockmeyer, E., Hudson, S. e Harrison, C. (2015). Acoustruments: passive, acoustically-driven, interactive controls for handheld devices. CHI ’15, ACM.', url: 'https://chrisharrison.net/index.php/Research/Acoustruments' },
  { id: 'acou2', cite: 'KurzweilAI (2015). Acoustically driven controls go beyond a smartphone’s touch screen.', url: 'https://www.kurzweilai.net/acoustically-driven-controls-go-beyond-a-smartphones-touch-screen' },
  { id: 'wifi', cite: 'Universidade de Washington (2017). In first, 3-D printed objects connect to WiFi without electronics. Trabalho de Iyer, Chan e Gollakota, SIGGRAPH Asia 2017.', url: 'https://www.washington.edu/news/2017/12/05/in-first-3-d-printed-objects-connect-to-wifi-without-electronics/' },
  { id: 'capricate', cite: 'Schmitz, M. et al. (2015). Capricate: a fabrication pipeline to design and 3D print capacitive touch sensors for interactive objects. UIST ’15, ACM.', url: 'https://mschmitz.org/publications/schmitz-UIST15-capricate.pdf' },
  { id: 'android', cite: 'Google. Control your Android device with Switch Access. Ajuda de acessibilidade do Android.', url: 'https://support.google.com/accessibility/android/answer/6122836?hl=en' },
  { id: 'apple', cite: 'Apple. Set up and turn on Switch Control on iPhone. Manual do iPhone.', url: 'https://support.apple.com/guide/iphone/set-up-switch-control-iph400b2f114/ios' },
  { id: 'msft', cite: 'Microsoft. Customize your Microsoft Adaptive Accessories with 3D-printable designs.', url: 'https://support.microsoft.com/en-us/topic/customize-your-microsoft-adaptive-accessories-with-3d-printable-designs-29ee6d7e-45f4-4730-bfe6-657c294d02ca' },
  { id: 'qi2', cite: 'TechCrunch (2023). Wireless Power Consortium is working with Apple to bring MagSafe-like capabilities to Android.', url: 'https://techcrunch.com/2023/01/04/wireless-power-consortium-is-working-with-apple-to-bring-magsafe-like-capabilities-to-android' },
  { id: 'ara', cite: 'Ubergizmo (2017). Motorola on why Project Ara failed.', url: 'https://ubergizmo.com/2017/01/motorola-on-why-project-ara-failed' },
  { id: 'atzeni', cite: 'Atzeni, E. e Salmi, A. (2012). Economics of additive manufacturing for end-usable metal parts. International Journal of Advanced Manufacturing Technology, 62, 1147–1155.', url: 'https://link.springer.com/search?query=Economics+of+additive+manufacturing+for+end-usable+metal+parts' },
  { id: 'bieler', cite: 'Bieler, S. e Weinberg, K. (2024). Energy absorption of sustainable lattice structures under impact loading. arXiv:2412.06547.', url: 'https://arxiv.org/abs/2412.06547' },
  { id: 'kellens', cite: 'Kellens, K. et al. (2017). Environmental dimensions of additive manufacturing: mapping application domains and their environmental implications. Journal of Industrial Ecology.', url: 'https://nottingham-repository.worktribe.com/output/875691' },
];
export const srcNum = id => SOURCES.findIndex(s => s.id === id) + 1;

// Destaques usados na página inicial
export const HIGHLIGHTS = [
  { big: '2,5 mil milhões', text: 'de pessoas precisam de pelo menos um produto de apoio. Quase mil milhões não lhe têm acesso.', src: 'who', short: 'OMS e UNICEF, 2022', color: 'c-blue', area: 'Biomedicina', anchor: 'biomedicina' },
  { big: '29%', text: 'dos produtos de apoio acabam abandonados. Ignorar a opinião de quem os usa é um dos motivos.', src: 'phillips', short: 'Phillips e Zhao, 1993', color: 'c-red', area: 'Biomedicina', anchor: 'biomedicina' },
  { big: '49%', text: 'das pessoas observadas a tocar no ecrã seguravam o telemóvel só com uma mão.', src: 'hoober', short: 'Hoober, 2013 (1333 observações)', color: 'c-green', area: 'Ergonomia', anchor: 'ergonomia' },
  { big: '99%', text: 'de precisão em botões e deslizadores de plástico impresso, sem eletrónica, lidos pelo próprio telemóvel.', src: 'acou2', short: 'Laput et al., CHI 2015', color: 'c-violet', area: 'Informática', anchor: 'informatica' },
];
