import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useI18n } from "../i18n";

interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

const TOUR_KEY = "hazina-tour-completed";

export default function OnboardingTour() {
  const { t } = useI18n();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const location = useLocation();
  const tourSteps: TourStep[] = [
    {
      target: '[data-tour="marketplace-link"]',
      title: t("onboarding.steps.marketplace.title"),
      description: t("onboarding.steps.marketplace.description"),
      placement: "bottom",
    },
    {
      target: '[data-tour="sell-link"]',
      title: t("onboarding.steps.sell.title"),
      description: t("onboarding.steps.sell.description"),
      placement: "bottom",
    },
    {
      target: '[data-tour="dashboard-link"]',
      title: t("onboarding.steps.dashboard.title"),
      description: t("onboarding.steps.dashboard.description"),
      placement: "bottom",
    },
    {
      target: '[data-tour="hero-cta"]',
      title: t("onboarding.steps.cta.title"),
      description: t("onboarding.steps.cta.description"),
      placement: "top",
    },
  ];

  useEffect(() => {
    // Only show tour on landing page and if not completed before
    if (location.pathname === "/" && !localStorage.getItem(TOUR_KEY)) {
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const step = tourSteps[currentStep];
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        const placement = step.placement || "bottom";

        let top = 0;
        let left = rect.left + rect.width / 2;

        if (placement === "bottom") {
          top = rect.bottom + 16;
        } else if (placement === "top") {
          top = rect.top - 16;
        }

        setPosition({ top, left });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStep, tourSteps]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsActive(false);
    localStorage.setItem(TOUR_KEY, "true");
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-void/80 backdrop-blur-sm z-[9998]"
        onClick={handleClose}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[9999] glass-card-gold p-6 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform:
            step.placement === "top"
              ? "translate(-50%, -100%)"
              : "translate(-50%, 0)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display font-semibold text-lg text-foreground pr-4">
            {step.title}
          </h3>
          <button
            onClick={handleClose}
            className="text-muted hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground-muted font-body leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-4">
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-6 bg-gold"
                  : i < currentStep
                    ? "w-2 bg-gold/40"
                    : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleClose}
            className="text-sm text-muted hover:text-foreground font-body transition-colors"
          >
            {t("onboarding.skip")}
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="btn-ghost px-4 py-2 text-sm flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("onboarding.back")}
              </button>
            )}
            <button
              onClick={handleNext}
              className="btn-gold px-4 py-2 text-sm flex items-center gap-1"
            >
              {isLast ? t("onboarding.finish") : t("onboarding.next")}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
