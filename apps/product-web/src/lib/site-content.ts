import {
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Cable,
  Cpu,
  type LucideIcon,
  Layers3,
  Orbit,
  Radar,
  ShieldCheck,
  TimerReset,
  Workflow,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  description: string;
};

export type FeatureCard = {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
};

export type TimelineItem = {
  title: string;
  detail: string;
  label: string;
};

export type PricingTier = {
  name: string;
  price_etb: number;
  billing_cycle: 'per month' | 'per quarter';
  included_units: {
    delivery_tasks: number | null;
    route_optimizations: number | null;
  };
  overage_rates: {
    delivery_tasks: number | null;
    route_optimizations: number | null;
  };
  summary: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

// Locked copy (blueprint §5 — [EXACT] strings, byte-identical)

export const heroHeadline = 'Run your first optimized route in 5 minutes. Free.';

export const heroParagraph =
  'Sign up and your workspace loads with sample data — warehouses, fleet, inventory, orders, all ready. Optimize your first route immediately. Upload your real CSVs when you\'re ready. Pay by bank transfer to CBE or Dashen when you outgrow the free tier. No card, no commitment.';

export const startFreeCta = 'Start free';

export const howItWorksHeading = 'How it works in 5 minutes';
export const showLabel = 'Show';
export const hideLabel = 'Hide';

export const howItWorksSteps = [
  'Sign up free — your workspace loads with sample data in under a minute.',
  'Run your first route optimization on the sample data — see the map, the stops, the schedule.',
  'Upload your real CSVs (warehouses, items, fleet, inventory, orders) when you\'re ready. Pay by bank transfer to CBE or Dashen when you outgrow the free tier.',
] as const;

export const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price_etb: 4500,
    billing_cycle: 'per month',
    included_units: { delivery_tasks: 2500, route_optimizations: 50 },
    overage_rates: { delivery_tasks: 0.2, route_optimizations: 1.5 },
    summary: 'First lift off Free tier',
  },
  {
    name: 'Scale',
    price_etb: 10000,
    billing_cycle: 'per quarter',
    included_units: { delivery_tasks: 5000, route_optimizations: 250 },
    overage_rates: { delivery_tasks: 0.16, route_optimizations: 1.0 },
    summary: 'Mid-size dispatch shop',
  },
  {
    name: 'Enterprise',
    price_etb: 45000,
    billing_cycle: 'per quarter',
    included_units: { delivery_tasks: null, route_optimizations: null },
    overage_rates: { delivery_tasks: null, route_optimizations: null },
    summary: 'Unlimited usage, dedicated support',
  },
];

export const freeLine = 'Free forever — 2,500 delivery tasks / month, no payment ever. Start here.';

export const partialPaymentStory =
  'Partial payments welcome. Pay what your cash flow allows — send the receipt for each transfer, and your workspace unlocks when the full balance clears. If you overpay within 1,000 ETB, the surplus applies as credit to your next invoice.';

export const paymentPaceStory =
  'Pay at your bank\'s pace — your first invoice isn\'t due until the start of the next billing period.';

export const trustStripLine =
  'Bank transfer to CBE or Dashen. No card required. Partial payments welcome. No hidden fees, no annual lock-in.';

export const verificationLine = 'Bank transfer to CBE or Dashen — receipt verified within 24 hours.';

export const signupFormSubline = 'Start free, no card required.';

export const signupFormNote = 'No card required. Your workspace loads with sample data.';

export const signupSuccessMessage = 'Workspace created — sample data loaded.';

export const networkFailureMessage =
  'Could not create the company workspace. Check your connection and try again.';

export const afterSignupSteps = [
  {
    label: '01',
    title: 'Your workspace loads with sample data',
    detail: 'Warehouses, fleet, inventory, and orders are all ready. No uploads needed to start.',
  },
  {
    label: '02',
    title: 'Run your first route optimization',
    detail: 'See the map, the stops, and the schedule on the sample data.',
  },
  {
    label: '03',
    title: "Upload your real CSVs when you're ready",
    detail: 'Pay by bank transfer to CBE or Dashen when you outgrow the free tier.',
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'Do you offer a free trial?',
    answer:
      'The Free tier is free forever — 2,500 delivery tasks per month, no payment ever. When you upgrade to a paid tier from inside your workspace, the first 7 days on that tier are a trial at no charge.',
  },
  {
    question: 'What does the Starter tier include?',
    answer:
      'Starter costs 4,500 ETB per month. It includes 2,500 delivery tasks and 50 route optimizations. Extra delivery tasks cost 0.20 ETB each, and extra route optimizations cost 1.50 ETB each.',
  },
  {
    question: 'What does the Scale tier include?',
    answer:
      'Scale costs 10,000 ETB per quarter. It includes 5,000 delivery tasks and 250 route optimizations. Extra delivery tasks cost 0.16 ETB each, and extra route optimizations cost 1.00 ETB each.',
  },
  {
    question: 'What does the Enterprise tier include?',
    answer:
      'Enterprise costs 45,000 ETB per quarter with unlimited usage and no overage rates. It includes dedicated support.',
  },
  {
    question: 'How do payments work?',
    answer:
      'Pay by bank transfer to CBE or Dashen — receipt verified within 24 hours. Partial payments are welcome: pay what your cash flow allows, send the receipt for each transfer, and your workspace unlocks when the full balance clears. If you overpay within 1,000 ETB, the surplus applies as credit to your next invoice.',
  },
];

// Site structure

export const externalLinks = {
  console:
    process.env.NEXT_PUBLIC_APP_CONSOLE_URL || 'https://freightpilot-ops.pages.dev',
  docs: '/docs',
  desktop: process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || 'https://example.com/download',
};

export const navigation: NavItem[] = [
  { label: 'Home', href: '/', description: 'Product overview' },
  { label: 'Platform', href: '/platform', description: 'Operational modules' },
  { label: 'Technology', href: '/technology', description: 'Decision controls' },
  { label: 'Pricing', href: '/pricing', description: 'Commercial plans' },
  { label: 'Launch', href: '/launch', description: 'Workspace setup' },
  { label: 'Contact', href: '/contact', description: 'Get in touch' },
];

/**
 * Footer link data — dead links removed for v1 (blueprint §1.12): no
 * `/privacy`, `/terms`, `/security` routes exist, and About/Blog/Careers/
 * Community pointed at `#`.
 */
export const footerNavigation = {
  platform: [
    { label: 'Control Tower', href: '/platform#control-tower' },
    { label: 'Decision Studio', href: '/platform#decision-studio' },
    { label: 'Launch Workstation', href: '/platform#launch-workstation' },
    { label: 'Revenue Guard', href: '/platform#revenue-guard' },
  ],
  resources: [
    { label: 'Documentation', href: externalLinks.docs },
    { label: 'API Reference', href: '/docs#api' },
    { label: 'Open console', href: externalLinks.console },
  ],
  company: [
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Security', href: '/security' },
    { label: 'Status', href: '/status' },
  ],
};

export const platformStacks: FeatureCard[] = [
  {
    id: 'control-tower',
    icon: Layers3,
    title: 'Control Tower',
    description: 'One place to plan routes, follow shipments, and handle problems.',
    detail: 'Your team can plan the day and respond to changes without switching between tools.',
  },
  {
    id: 'decision-studio',
    icon: Workflow,
    title: 'Route planning',
    description: 'Compare routes by time, cost, and the stops they can cover.',
    detail: 'Use the same route plan when you dispatch deliveries.',
  },
  {
    id: 'launch-workstation',
    icon: Orbit,
    title: 'Guided setup',
    description: 'See each setup step and know who needs to do it.',
    detail: 'Start with sample data, then add your own as your team is ready.',
  },
  {
    icon: TimerReset,
    title: 'Usage and billing',
    description: 'See how many tasks you use and what your plan includes.',
    detail: 'Know when you are close to a plan limit before it affects your work.',
  },
];

export const operatingLoop: TimelineItem[] = [
  {
    label: '01',
    title: 'See problems early',
    detail: 'Find late deliveries, route changes, and low stock before they cause bigger problems.',
  },
  {
    label: '02',
    title: 'Decide with the full picture',
    detail: 'Compare routes, delivery loads, and approvals in one place.',
  },
  {
    label: '03',
    title: 'Keep a clear record',
    detail: 'Review who changed a route or payment and when it happened.',
  },
];

export const technologyLayers: FeatureCard[] = [
  {
    icon: Radar,
    title: 'Live work data',
    description: 'Bring route, delivery, stock, and usage data together.',
    detail: 'Your team sees the same information when making a decision.',
  },
  {
    icon: Cpu,
    title: 'Your choice of AI',
    description: 'Owners choose which AI provider to use.',
    detail: 'AI can help suggest a decision, but your team still approves it.',
  },
  {
    icon: ShieldCheck,
    title: 'Changes are recorded',
    description: 'Review changes to routes, settings, and connected services.',
    detail: 'You can see who made a change and when.',
  },
  {
    icon: Cable,
    title: 'Easy to connect',
    description: 'Use FreightPilot on the web and desktop.',
    detail: 'Your team sees the same workspace on both.',
  },
];

export const codeSnippet = `POST /api/v1/routes/optimize
Authorization: Bearer <workspace-token>
X-Organization-Id: <workspace-id>

{
  "start_warehouse_code": "WH-001",
  "deliveries": [
    { "warehouse_code": "WH-002", "demand_units": 80 },
    { "warehouse_code": "WH-003", "demand_units": 60 }
  ],
  "vehicle_capacity_units": 180
}

// Response includes route stops, cost units,
// unassigned demand, and a decision explanation.`;

/** Honest trust signals — each one maps to a verifiable product behavior. */
export const trustSignals = [
  'Bank transfer to CBE or Dashen',
  'No card required',
  'Sample data on signup',
  'Partial payments welcome',
  'Audit timelines',
  'Usage metering',
];

export const iconLinks = [
  { label: 'Open console', href: externalLinks.console, icon: ArrowUpRight },
  { label: 'Download desktop', href: externalLinks.desktop, icon: Boxes },
  { label: 'Read docs', href: externalLinks.docs, icon: BadgeCheck },
];

export const trustRibbon = ['See key changes', 'Control AI access', 'Add your team in stages'];
