import { GraduationCap, ShieldCheck, Star, Users } from "lucide-react";
import type React from "react";

type PortalAuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PortalAuthShell({ title, description, children }: PortalAuthShellProps) {
  return (
    <section className="bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-5 text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">
              Interview Readiness Coach (IRC)
            </p>
            <h1 className="mb-6 max-w-2xl text-4xl font-semibold leading-[1.08] text-wsa-navy md:text-5xl">
              Your study abroad journey, guided by real advisers.
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-8 text-gray-600">
              Access resources, interview preparation and next steps from the same World Student Advisors team supporting your application.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Users, label: "Personal counsellor support" },
                { icon: ShieldCheck, label: "British Council recognised" },
                { icon: Star, label: "Google-reviewed service" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="border-t-2 border-wsa-red/20 bg-white p-4">
                    <Icon className="mb-3 h-5 w-5 text-wsa-red" />
                    <p className="text-sm font-medium leading-5 text-wsa-navy">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="border border-border/70 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center bg-wsa-navy text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-wsa-navy">{title}</h2>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type PortalMessageShellProps = {
  title: string;
  message: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
};

export function PortalMessageShell({ title, message, children, icon }: PortalMessageShellProps) {
  return (
    <section className="bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="container">
        <div className="mx-auto max-w-md border border-border/70 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-wsa-navy text-white">
            {icon ?? <GraduationCap className="h-6 w-6" />}
          </div>
          <h1 className="mb-3 text-2xl font-semibold text-wsa-navy">{title}</h1>
          <p className="mb-6 text-sm leading-6 text-gray-600">{message}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
