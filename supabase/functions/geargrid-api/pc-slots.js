export const corePcSlots = [
  { id: 'cpu', label: 'Processor', icon: 'chip', pattern: /^(?:cpu|processors?|desktop processors?)$/i, required: true },
  { id: 'cooler', label: 'CPU cooler', icon: 'fan', pattern: /^(?:cpu coolers?|processor coolers?)$/i },
  { id: 'motherboard', label: 'Motherboard', icon: 'chip', pattern: /^motherboards?$/i, required: true },
  { id: 'memory', label: 'RAM', icon: 'chip', pattern: /^(?:ram|memory|desktop (?:memory|ram))$/i, required: true },
  { id: 'storage', label: 'Storage', icon: 'storage', pattern: /^(?:ssd|hdd|internal storage|solid state drives?|hard disk drives?)$/i, required: true },
  { id: 'graphics', label: 'Graphics card', icon: 'desktop', pattern: /^(?:gpu|graphics cards?|video cards?)$/i },
  { id: 'power', label: 'Power supply', icon: 'bolt', pattern: /^(?:psu|power suppl(?:y|ies))$/i, required: true },
  { id: 'case', label: 'PC case', icon: 'desktop', pattern: /^(?:pc cases?|casings?|computer cases?)$/i, required: true },
];

export const peripheralPcSlots = [
  { id: 'monitor', label: 'Monitor', icon: 'monitor', pattern: /^(?:(?:gaming|computer|pc) )?monitors?$/i },
  { id: 'case_cooler', label: 'Casing Cooler', icon: 'fan', pattern: /^(?:case|casing|chassis) (?:fans?|coolers?)$/i },
  { id: 'keyboard', label: 'Keyboard', icon: 'keyboard', pattern: /^(?:(?:gaming|wired|wireless|mechanical) )?keyboards?$/i },
  { id: 'mouse', label: 'Mouse', icon: 'mouse', pattern: /^(?:(?:gaming|wired|wireless) )?(?:mice|mouse|mouses)$/i },
  { id: 'speaker', label: 'Speaker & Home Theater', icon: 'speaker', pattern: /^(?:speakers?(?:\s*(?:&|and|\/)\s*home theat(?:er|re)s?)?|home theat(?:er|re)s?)$/i },
  { id: 'headphone', label: 'Headphone', icon: 'headphones', pattern: /^(?:(?:gaming|wired|wireless) )?head(?:phones?|sets?)(?:\s*(?:&|and|\/)\s*head(?:phones?|sets?))?$/i },
  { id: 'network_adapter', label: 'Wi-Fi Adapter / LAN Card', icon: 'network', pattern: /^(?:(?:(?:usb|wireless) )?wi[ -]?fi (?:adapters?|cards?)(?:\s*\/\s*lan cards?)?|(?:lan|network|wireless|ethernet) (?:adapters?|cards?))$/i },
  { id: 'antivirus', label: 'Antivirus', icon: 'shield', pattern: /^anti[ -]?virus(?: software)?$/i },
  { id: 'ups', label: 'UPS', icon: 'ups', pattern: /^(?:(?:online |offline )?ups|uninterruptible power suppl(?:y|ies))$/i },
];

export const pcSlots = [...corePcSlots, ...peripheralPcSlots];
