'use client';

import { Users, Target, Award, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";
import { aboutImg } from "@/assets";

const About = () => {
  const { t } = useLanguage();

  const values = [
    {
      icon: Target,
      title: t("about.values.mission.title"),
      description: t("about.values.mission.desc"),
    },
    {
      icon: Users,
      title: t("about.values.customer.title"),
      description: t("about.values.customer.desc"),
    },
    {
      icon: Award,
      title: t("about.values.quality.title"),
      description: t("about.values.quality.desc"),
    },
    {
      icon: Globe,
      title: t("about.values.local.title"),
      description: t("about.values.local.desc"),
    },
  ];

  const team = [
    {
      name: "John Uwimana",
      role: t("about.team.ceo"),
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
      description: t("about.team.ceoDesc"),
    },
    {
      name: "Sarah Mukamana",
      role: t("about.team.cto"),
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b8c5?w=300&h=300&fit=crop",
      description: t("about.team.ctoDesc"),
    },
    {
      name: "David Niyongira",
      role: t("about.team.ops"),
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop",
      description: t("about.team.opsDesc"),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-blue-500 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            {t("about.title")}
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            {t("about.hero")}
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="p-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                {t("about.storyTitle")}
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>{t("about.story1")}</p>
                <p>{t("about.story2")}</p>
                <p>{t("about.story3")}</p>
              </div>
            </div>
            <div>
              <Image
                priority
                src={aboutImg}
                width={500}
                height={500}
                alt={"about image"}
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="p-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {t("about.valuesTitle")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.valuesDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                    <value.icon className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      {/* <section className="p-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("about.teamTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.teamDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                  <p className="text-orange-500 font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm">
                    {member.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* Stats Section */}
      <section className="p-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <h3 className="text-3xl font-bold text-orange-500 mb-2">10K+</h3>
              <p className="text-muted-foreground">
                {t("about.stats.customers")}
              </p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-orange-500 mb-2">5K+</h3>
              <p className="text-muted-foreground">
                {t("about.stats.products")}
              </p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-orange-500 mb-2">50+</h3>
              <p className="text-muted-foreground">
                {t("about.stats.partners")}
              </p>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-orange-500 mb-2">99%</h3>
              <p className="text-muted-foreground">
                {t("about.stats.satisfaction")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;