import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  FileText, 
  Users, 
  BarChart3, 
  Shield, 
  Sparkles, 
  CheckCircle2,
  ArrowRight,
  Zap,
  Clock,
  DollarSign,
  Building2,
  Smartphone,
  Package,
  ClipboardCheck
} from 'lucide-react';
import { Link } from 'wouter';
import dashboardImage from '@assets/generated_images/shop_management_dashboard_ui.png';
import repairOrderImage from '@assets/generated_images/repair_order_detail_ui.png';
import inspectionImage from '@assets/generated_images/vehicle_inspection_interface_ui.png';

export default function Landing() {
  const features = [
    {
      icon: FileText,
      title: 'Repair Order Management',
      description: 'Complete RO lifecycle from estimate to invoice with job-based workflows, parts tracking, and labor management.',
    },
    {
      icon: ClipboardCheck,
      title: 'Digital Vehicle Inspections',
      description: 'Color-coded DVI with photos, videos, and shareable customer reports. Build trust with transparency.',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Service Writing',
      description: 'Generate professional service descriptions and authorization requests instantly with AI assistance.',
      highlight: true,
    },
    {
      icon: Package,
      title: 'Parts Ordering Integration',
      description: 'Connect with PartsTech for seamless parts search, pricing, and ordering from your preferred suppliers.',
    },
    {
      icon: Users,
      title: 'Customer Management',
      description: 'Complete customer profiles with vehicle history, communication logs, and loyalty tracking.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      description: 'Real-time dashboards for revenue, technician productivity, and parts performance metrics.',
    },
    {
      icon: Building2,
      title: 'Multi-Location Support',
      description: 'Enterprise-ready with multi-tenant architecture, role-based access, and location-specific settings.',
    },
    {
      icon: Clock,
      title: 'Appointment Scheduling',
      description: 'Bay-aware scheduling with technician assignment and capacity management.',
    },
  ];

  const benefits = [
    { icon: Zap, text: 'Increase shop efficiency by 40%' },
    { icon: DollarSign, text: 'Boost average repair order value' },
    { icon: Clock, text: 'Reduce admin time by 50%' },
    { icon: Shield, text: 'Enterprise-grade security' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/bayops-logo.png" 
              alt="BayOPS" 
              className="h-10 object-contain"
            />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" data-testid="link-login">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button data-testid="link-signup">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <Badge className="mb-6 bg-purple-100 text-purple-700 hover:bg-purple-100">
          <Sparkles className="w-3 h-3 mr-1" />
          AI-Powered Shop Management
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          The Modern Shop Management<br />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            System Built for Growth
          </span>
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10">
          Streamline your automotive repair business with intelligent workflows, 
          digital inspections, and AI-powered tools that help you work smarter, not harder.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-6" data-testid="button-hero-cta">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" data-testid="button-hero-demo">
              View Demo
            </Button>
          </Link>
        </div>
        
        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <benefit.icon className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-slate-700">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshots Showcase Section */}
      <section className="bg-slate-100 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
              See It In Action
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Powerful, Intuitive Interface
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Designed by shop owners, for shop owners. Clean layouts that make sense from day one.
            </p>
          </div>
          
          <div className="space-y-12">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-slate-400 text-sm ml-2">Dashboard Overview</span>
              </div>
              <img 
                src={dashboardImage} 
                alt="BayOPS Dashboard showing repair orders, revenue stats, and technician status" 
                className="w-full"
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-slate-400 text-sm ml-2">Repair Order Detail</span>
                </div>
                <img 
                  src={repairOrderImage} 
                  alt="Repair order detail screen with jobs, parts, and labor" 
                  className="w-full"
                />
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-slate-400 text-sm ml-2">Digital Vehicle Inspection</span>
                </div>
                <img 
                  src={inspectionImage} 
                  alt="Digital vehicle inspection with color-coded status indicators" 
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Everything You Need to Run Your Shop
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            From the service drive to the invoice, BayOPS handles every step of your repair workflow.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card 
              key={idx} 
              className={`hover:shadow-lg transition-shadow ${
                feature.highlight ? 'ring-2 ring-purple-200 bg-gradient-to-br from-purple-50 to-white' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  feature.highlight 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                    : 'bg-blue-100'
                }`}>
                  <feature.icon className={`w-6 h-6 ${feature.highlight ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <Badge className="mb-6 bg-white/20 text-white hover:bg-white/30 border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Powered by AI
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              AI That Actually Helps Your Technicians
            </h2>
            <p className="text-xl text-purple-100 mb-10">
              From auto-generating service descriptions to creating professional authorization requests,
              our AI tools save hours of writing and help your team communicate more effectively.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <CheckCircle2 className="w-8 h-8 text-purple-200 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Service Descriptions</h3>
                <p className="text-purple-100 text-sm">Generate clear, professional service descriptions from technician notes.</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <CheckCircle2 className="w-8 h-8 text-purple-200 mb-4" />
                <h3 className="font-semibold text-lg mb-2">Authorization Requests</h3>
                <p className="text-purple-100 text-sm">Create persuasive customer authorization messages in seconds.</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <CheckCircle2 className="w-8 h-8 text-purple-200 mb-4" />
                <h3 className="font-semibold text-lg mb-2">DVI Tech Notes</h3>
                <p className="text-purple-100 text-sm">Transform inspection findings into customer-friendly recommendations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Location Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
              Enterprise Ready
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Scale From One Bay to One Hundred
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Whether you're a single-location independent shop or a multi-state enterprise,
              BayOPS grows with you. Multi-tenant architecture means each location gets
              its own settings, users, and data while you maintain oversight of everything.
            </p>
            <ul className="space-y-4">
              {[
                'Unlimited locations and users',
                'Role-based permissions (Owner, Manager, Advisor, Tech)',
                'Location-specific pricing and markups',
                'Consolidated reporting across all shops',
                'White-label options for enterprise organizations',
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-slate-900">Acme Auto Group</h4>
                  <p className="text-sm text-slate-500">5 locations, 32 users</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">Downtown Shop</span>
                  <Badge variant="secondary" className="text-xs">12 ROs Today</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">Westside Location</span>
                  <Badge variant="secondary" className="text-xs">8 ROs Today</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">Airport Service</span>
                  <Badge variant="secondary" className="text-xs">15 ROs Today</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Shop?
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Join hundreds of shops already using BayOPS to increase efficiency,
            boost revenue, and deliver better customer experiences.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700" data-testid="button-cta-trial">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-slate-500 mt-4 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img 
                src="/bayops-logo.png" 
                alt="BayOPS" 
                className="h-8 object-contain"
              />
            </div>
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} BayOPS. Modern shop management for modern shops.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
