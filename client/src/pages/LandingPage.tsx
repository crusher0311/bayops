import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ShieldCheck,
  Wrench,
  ClipboardCheck,
  Zap,
  Users,
  BarChart3,
  Building2,
  Calendar,
  MessageSquare,
  FileCheck,
  Check,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-[#0d1b2a]/95 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2" data-testid="logo">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Bay<span className="text-sky-400">OPS</span></span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className="text-slate-300 hover:text-white font-medium transition-colors" data-testid="link-signin">
            Sign In
          </Link>
          <Link href="/signup">
            <Button 
              size="lg" 
              className="bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all" 
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </Link>
        </div>

        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-mobile-menu">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-[#0d1b2a] border-white/10">
              <div className="flex flex-col gap-6 mt-10">
                <Link href="/login" className="text-lg font-medium text-white" onClick={() => setIsOpen(false)}>
                  Sign In
                </Link>
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Button size="lg" className="w-full bg-sky-500 hover:bg-sky-400">
                    Get Started
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d1b2a] overflow-hidden font-sans">
      <LandingHeader />

      <section className="relative pt-20 pb-32 bg-gradient-to-b from-[#0d1b2a] via-[#112240] to-[#0d1b2a]">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-sky-500/10 blur-[120px] -top-40 -left-40"></div>
          <div className="absolute w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[120px] top-20 right-0"></div>
        </div>

        <div className="container mx-auto px-6 text-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-sky-500/10 text-sky-400 mb-8 border border-sky-500/20" data-testid="badge-ai-powered">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Shop Management
            </span>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-8 leading-[1.1] tracking-tight" data-testid="text-hero-title">
              The Modern Shop Management<br className="hidden md:block" />
              <span className="bg-gradient-to-r from-sky-400 to-orange-400 bg-clip-text text-transparent">System Built for Growth</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed" data-testid="text-hero-subtitle">
              Streamline your automotive repair business with intelligent workflows, 
              digital inspections, and AI-powered tools that help you work smarter, not harder.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-lg h-14 px-8 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all duration-300" 
                  data-testid="button-get-started-hero"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-xl border-slate-600 text-white hover:bg-white/10 hover:border-slate-500" data-testid="button-login">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto"
          >
            {[
              { icon: TrendingUp, label: "Increase shop efficiency by 40%" },
              { icon: DollarSign, label: "Boost average repair order value" },
              { icon: Clock, label: "Reduce admin time by 50%" },
              { icon: ShieldCheck, label: "Enterprise-grade security" }
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeIn} className="text-center group" data-testid={`stat-${i}`}>
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 group-hover:bg-sky-500/20 flex items-center justify-center mx-auto mb-4 transition-colors duration-300 border border-sky-500/20">
                  <stat.icon className="w-7 h-7 text-sky-400" />
                </div>
                <p className="text-sm font-semibold text-slate-300 max-w-[160px] mx-auto leading-snug">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-slate-50 to-white py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
              Everything You Need to Run Your Shop
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From the service drive to the invoice, BayOPS handles every step of your repair workflow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ClipboardCheck,
                title: "Repair Order Management",
                desc: "Complete RO lifecycle from estimate to invoice with job-based workflows, parts tracking, and labor management."
              },
              {
                icon: FileCheck,
                title: "Digital Vehicle Inspections",
                desc: "Color-coded DVI with photos, videos, and shareable customer reports. Build trust with transparency."
              },
              {
                icon: Zap,
                title: "AI-Powered Service Writing",
                desc: "Generate professional service descriptions and authorization requests instantly with AI assistance.",
                highlight: true
              },
              {
                icon: Wrench,
                title: "Parts Ordering Integration",
                desc: "Connect with PartsTech for seamless parts search, pricing, and ordering from your preferred suppliers."
              },
              {
                icon: Users,
                title: "Customer Management",
                desc: "Complete customer profiles with vehicle history, communication logs, and loyalty tracking."
              },
              {
                icon: BarChart3,
                title: "Analytics & Reporting",
                desc: "Real-time dashboards for revenue, technician productivity, and parts performance metrics."
              },
              {
                icon: Building2,
                title: "Multi-Location Support",
                desc: "Enterprise-ready with multi-tenant architecture, role-based access, and location-specific settings."
              },
              {
                icon: Calendar,
                title: "Appointment Scheduling",
                desc: "Bay-aware scheduling with technician assignment and capacity management."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 hover:shadow-xl transition-all duration-300 border ${
                  feature.highlight 
                    ? "bg-gradient-to-br from-orange-50 to-white ring-2 ring-orange-300 border-transparent" 
                    : "bg-white border-slate-200 hover:border-sky-200"
                }`}
                data-testid={`feature-${i}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                  feature.highlight 
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30" 
                    : "bg-sky-50"
                }`}>
                  <feature.icon className={`w-7 h-7 ${feature.highlight ? "text-white" : "text-sky-600"}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#0d1b2a] via-sky-900 to-[#0d1b2a] py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-50"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white mb-20">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-white/10 border border-white/20 text-white mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2 text-orange-400" />
              Powered by AI
            </span>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight">
              AI That Actually Helps Your Technicians
            </h2>
            <p className="text-xl text-sky-100 max-w-2xl mx-auto leading-relaxed">
              From auto-generating service descriptions to creating professional authorization requests,
              our AI tools save hours of writing and help your team communicate more effectively.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Service Descriptions", desc: "Generate clear, professional service descriptions from technician notes.", icon: FileCheck },
              { title: "Authorization Requests", desc: "Create persuasive customer authorization messages in seconds.", icon: MessageSquare },
              { title: "DVI Tech Notes", desc: "Transform inspection findings into customer-friendly recommendations.", icon: ClipboardCheck }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-colors"
                data-testid={`ai-feature-${i}`}
              >
                <item.icon className="w-10 h-10 text-orange-400 mb-6" />
                <h3 className="font-bold text-xl text-white mb-3">{item.title}</h3>
                <p className="text-sky-100/80">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-sky-100 text-sky-700 mb-6">
                Enterprise Ready
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Scale From One Bay to One Hundred
              </h2>
              <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                Whether you're a single-location independent shop or a multi-state enterprise,
                BayOPS grows with you. Multi-tenant architecture means each location gets
                its own settings, users, and data while you maintain oversight of everything.
              </p>
              <ul className="space-y-5">
                {[
                  "Unlimited locations and users",
                  "Role-based permissions (Owner, Manager, Advisor, Tech)",
                  "Location-specific pricing and markups",
                  "Consolidated reporting across all shops",
                  "White-label options for enterprise organizations"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-slate-100 rounded-[2.5rem] p-8 md:p-12">
              <div className="bg-white rounded-2xl shadow-xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-slate-900">Acme Auto Group</h4>
                    <p className="text-slate-500 font-medium">5 locations, 32 users</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { name: "Downtown Shop", count: 12 },
                    { name: "Westside Location", count: 8 },
                    { name: "Airport Service", count: 15 }
                  ].map((shop, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">{shop.name}</span>
                      <span className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-full">{shop.count} ROs Today</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0d1b2a] py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute top-40 -left-20 w-72 h-72 bg-orange-500/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Shop?
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
            Join hundreds of shops already using BayOPS to increase efficiency,
            boost revenue, and deliver better customer experiences.
          </p>
          <div className="flex flex-col items-center gap-6">
            <Link href="/signup">
              <Button 
                size="lg" 
                className="h-16 px-10 text-lg rounded-xl bg-sky-500 hover:bg-sky-400 shadow-xl shadow-sky-500/30" 
                data-testid="button-cta-get-started"
              >
                Get Started Today
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-slate-500 text-sm font-medium">
              Simple pricing  &bull;  No hidden fees  &bull;  Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-[#091422] py-12 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Bay<span className="text-sky-400">OPS</span></span>
            </div>
            <p className="text-slate-500 text-sm text-center md:text-right">
              &copy; 2025 BayOPS. Modern shop management for modern shops.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
