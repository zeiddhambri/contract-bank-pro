import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, FileText, Shield, Users, Zap, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

const Landing = () => {
  const features = [
    {
      icon: FileText,
      title: "Gestion Centralisée",
      description: "Stockez, organisez et gérez tous vos contrats en un seul endroit sécurisé."
    },
    {
      icon: Shield,
      title: "Sécurité Avancée",
      description: "Protection de niveau bancaire avec chiffrement et contrôles d'accès granulaires."
    },
    {
      icon: Users,
      title: "Collaboration d'Équipe",
      description: "Travaillez ensemble sur les contrats avec des workflows de validation personnalisés."
    },
    {
      icon: Zap,
      title: "Automatisation",
      description: "Automatisez les processus répétitifs et recevez des alertes importantes."
    }
  ];

  const benefits = [
    "Réduction du temps de traitement de 75%",
    "Conformité réglementaire garantie",
    "Traçabilité complète des modifications",
    "Interface intuitive et moderne",
    "Support client dédié 24/7",
    "Intégration avec vos outils existants"
  ];

  const testimonials = [
    {
      name: "Marie Dubois",
      role: "Directrice Juridique",
      company: "Banque Centrale",
      content: "Contract Manager a révolutionné notre gestion des contrats. Nous avons gagné en efficacité et en sécurité.",
      rating: 5
    },
    {
      name: "Ahmed Ben Ali",
      role: "Responsable Conformité",
      company: "Crédit Pro",
      content: "Un outil indispensable pour maintenir notre conformité réglementaire. Interface excellente et fonctionnalités complètes.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Animated Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
        
        {/* Medium stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={`med-${i}`}
            className="absolute w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
        
        {/* Small twinkling stars */}
        {[...Array(100)].map((_, i) => (
          <div
            key={`small-${i}`}
            className="absolute w-px h-px bg-slate-300 rounded-full opacity-70"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${1 + Math.random() * 2}s ease-in-out infinite alternate`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
        
        {/* Shooting stars */}
        <div className="absolute top-1/4 left-1/4 w-32 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-0 animate-pulse" 
             style={{ animationDuration: '8s', animationDelay: '3s' }} />
        <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-0 animate-pulse" 
             style={{ animationDuration: '10s', animationDelay: '6s' }} />
      </div>

      {/* Mountain silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-slate-900 to-transparent">
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <path d="M0,300 L0,150 L200,100 L400,120 L600,80 L800,110 L1000,90 L1200,130 L1200,300 Z" 
                fill="rgba(0,0,0,0.8)" />
          <path d="M0,300 L0,180 L150,140 L350,160 L550,120 L750,150 L950,130 L1200,160 L1200,300 Z" 
                fill="rgba(0,0,0,0.6)" />
        </svg>
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-slate-700/30 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Logo />
              <span className="text-2xl font-bold text-white tracking-wider">JURIX</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Produit
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Tarifs
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Ressources
              </Button>
              <Button asChild variant="outline" className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10">
                <Link to="/auth">Connexion</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                <Link to="/auth">Commencer</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-32 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-7xl font-bold text-white mb-4 tracking-wider opacity-90">
              JURIX
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-red-400 mx-auto mb-8"></div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-light text-white mb-8 leading-tight opacity-90">
            Launching Soon
          </h2>
          
          <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto opacity-80">
            La plateforme de gestion de contrats la plus avancée pour les institutions financières. 
            Sécurisez, automatisez et optimisez vos processus contractuels.
          </p>
          
          <div className="mb-16">
            <h3 className="text-2xl font-light text-white mb-8">Contact Us</h3>
            <p className="text-lg text-slate-300 mb-8">Drop us a line!</p>
            
            <div className="max-w-md mx-auto space-y-4">
              <input 
                type="text" 
                placeholder="Name" 
                className="w-full px-4 py-3 bg-black/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 backdrop-blur-sm focus:border-orange-500 focus:outline-none transition-colors"
              />
              <input 
                type="email" 
                placeholder="Email*" 
                className="w-full px-4 py-3 bg-black/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 backdrop-blur-sm focus:border-orange-500 focus:outline-none transition-colors"
              />
              <textarea 
                placeholder="Message" 
                rows={4}
                className="w-full px-4 py-3 bg-black/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 backdrop-blur-sm focus:border-orange-500 focus:outline-none transition-colors resize-none"
              />
              <Button 
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-lg py-3"
              >
                Envoyer le message
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - with backdrop */}
      <section className="relative z-10 py-20 px-4 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Des fonctionnalités puissantes conçues spécifiquement pour les professionnels du secteur financier
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:scale-105 transition-transform duration-300">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-20 px-4 bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Pourquoi choisir Contract Manager ?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Rejoignez des centaines d'institutions financières qui font confiance à notre plateforme 
                pour gérer leurs contrats en toute sécurité et efficacité.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-slate-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-8 border border-slate-700/50">
                <div className="space-y-4">
                  <div className="h-4 bg-gradient-to-r from-orange-600/50 to-red-600/50 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                  <div className="h-20 bg-slate-800 rounded border border-slate-600"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded px-4 flex items-center">
                      <span className="text-white text-sm">Approuvé</span>
                    </div>
                    <div className="h-8 bg-slate-700 rounded px-4 flex items-center">
                      <span className="text-slate-300 text-sm">En attente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ce que disent nos clients
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6 italic">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white font-semibold">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-slate-400">{testimonial.role} • {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 bg-gradient-to-r from-orange-600/10 to-red-600/10 backdrop-blur-sm">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Prêt à transformer votre gestion de contrats ?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers de professionnels qui utilisent Contract Manager pour simplifier leurs processus.
          </p>
          <Button 
            asChild
            size="lg" 
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-lg px-8 py-4"
          >
            <Link to="/auth">
              Commencer maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/30 bg-black/40 backdrop-blur-sm py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Logo />
                <span className="text-xl font-bold text-white">CONTRACT MANAGER</span>
              </div>
              <p className="text-slate-400 text-sm">
                La solution de gestion de contrats la plus sécurisée pour les institutions financières.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Produit</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>Fonctionnalités</li>
                <li>Intégrations</li>
                <li>Sécurité</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Ressources</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>Documentation</li>
                <li>Support</li>
                <li>Blog</li>
                <li>Guides</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Entreprise</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>À propos</li>
                <li>Carrières</li>
                <li>Contact</li>
                <li>Partenaires</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700/50 mt-12 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 Contract Manager. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
