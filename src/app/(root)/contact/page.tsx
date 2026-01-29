"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";

const Contact = () => {
   const { t } = useLanguage();
   const [formData, setFormData] = useState({
      name: "",
      email: "",
      subject: "",
      message: "",
   });

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Handle form submission
      // POST to server API
      setStatus({ loading: true, error: null, success: null });
      fetch("/api/contact/send", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(formData),
      })
         .then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
               throw new Error(json?.error || "Failed to send message");
            setStatus({ loading: false, error: null, success: true });
            setFormData({ name: "", email: "", subject: "", message: "" });
         })
         .catch((err) => {
            setStatus({
               loading: false,
               error: String(err?.message || err),
               success: false,
            });
         });
   };

   const [status, setStatus] = useState<{
      loading: boolean;
      error: string | null;
      success: boolean | null;
   }>({ loading: false, error: null, success: null });

   const contactInfo = [
      {
         icon: MapPin,
         title: t("contact.address"),
         content: t("contact.addressContent"),
      },
      {
         icon: Phone,
         title: t("contact.phone"),
         content: t("contact.phoneContent"),
      },
      {
         icon: Mail,
         title: t("contact.email"),
         content: t("contact.emailContent"),
      },
      {
         icon: Clock,
         title: t("contact.hours"),
         content: t("contact.hoursContent"),
      },
   ];

   return (
      <div className="min-h-screen">
         {/* Hero Section */}
         <section className="bg-gradient-to-br from-orange-500 to-blue-500 py-20">
            <div className="container mx-auto px-4 text-center">
               <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
                  {t("nav.contact")}
               </h1>
               <p className="text-xl text-white/90 max-w-2xl mx-auto">
                  {t("contact.hero")}
               </p>
            </div>
         </section>

         <section className="p-16">
            <div className="container mx-auto px-4">
               <div className="grid lg:grid-cols-2 gap-12">
                  {/* Contact Form */}
                  <div>
                     <Card>
                        <CardHeader>
                           <CardTitle className="text-2xl">
                              {t("contact.formTitle")}
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <form
                              onSubmit={handleSubmit}
                              className="space-y-6"
                           >
                              <div>
                                 <Label htmlFor="name">
                                    {t("contact.fullName")}
                                 </Label>
                                 <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                       setFormData({
                                          ...formData,
                                          name: e.target.value,
                                       })
                                    }
                                    required
                                    disabled={status.loading}
                                 />
                              </div>

                              <div>
                                 <Label htmlFor="email">
                                    {t("contact.emailLabel")}
                                 </Label>
                                 <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                       setFormData({
                                          ...formData,
                                          email: e.target.value,
                                       })
                                    }
                                    required
                                    disabled={status.loading}
                                 />
                              </div>

                              <div>
                                 <Label htmlFor="subject">
                                    {t("contact.subject")}
                                 </Label>
                                 <Input
                                    id="subject"
                                    value={formData.subject}
                                    onChange={(e) =>
                                       setFormData({
                                          ...formData,
                                          subject: e.target.value,
                                       })
                                    }
                                    required
                                    disabled={status.loading}
                                 />
                              </div>

                              <div>
                                 <Label htmlFor="message">
                                    {t("contact.message")}
                                 </Label>
                                 <Textarea
                                    id="message"
                                    rows={5}
                                    value={formData.message}
                                    onChange={(e) =>
                                       setFormData({
                                          ...formData,
                                          message: e.target.value,
                                       })
                                    }
                                    required
                                    disabled={status.loading}
                                 />
                              </div>

                              <Button
                                 type="submit"
                                 className="w-full flex items-center justify-center"
                                 size="lg"
                                 disabled={status.loading}
                              >
                                 {status.loading && (
                                    <span className="inline-block mr-3 w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                 )}
                                 {status.loading
                                    ? t("contact.sending")
                                    : t("contact.send")}
                              </Button>
                              {status.error && (
                                 <div className="text-sm text-destructive mt-2">
                                    {status.error}
                                 </div>
                              )}
                              {status.success && (
                                 <div className="text-sm text-green-600 mt-2">
                                    {t("contact.sentSuccess")}
                                 </div>
                              )}
                           </form>
                        </CardContent>
                     </Card>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-6">
                     <div>
                        <h2 className="text-2xl font-bold mb-6">
                           {t("contact.getInTouch")}
                        </h2>
                        <p className="text-muted-foreground mb-8">
                           {t("contact.getInTouchDesc")}
                        </p>
                     </div>

                     <div className="grid gap-6">
                        {contactInfo.map((info, index) => (
                           <Card key={index}>
                              <CardContent className="p-6">
                                 <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                       <info.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                       <h3 className="font-semibold mb-2">
                                          {info.title}
                                       </h3>
                                       <p className="text-muted-foreground whitespace-pre-line">
                                          {info.content}
                                       </p>
                                    </div>
                                 </div>
                              </CardContent>
                           </Card>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* FAQ Section */}
         <section className="p-16 bg-muted/30">
            <div className="container mx-auto px-4">
               <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-4">
                     {t("contact.faqTitle")}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                     {t("contact.faqDesc")}
                  </p>
               </div>

               <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <Card>
                     <CardContent className="p-6">
                        <h3 className="font-semibold mb-3">
                           {t("contact.faq1.q")}
                        </h3>
                        <p className="text-muted-foreground">
                           {t("contact.faq1.a")}
                        </p>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardContent className="p-6">
                        <h3 className="font-semibold mb-3">
                           {t("contact.faq2.q")}
                        </h3>
                        <p className="text-muted-foreground">
                           {t("contact.faq2.a")}
                        </p>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardContent className="p-6">
                        <h3 className="font-semibold mb-3">
                           {t("contact.faq3.q")}
                        </h3>
                        <p className="text-muted-foreground">
                           {t("contact.faq3.a")}
                        </p>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardContent className="p-6">
                        <h3 className="font-semibold mb-3">
                           {t("contact.faq4.q")}
                        </h3>
                        <p className="text-muted-foreground">
                           {t("contact.faq4.a")}
                        </p>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </section>
      </div>
   );
};

export default Contact;
