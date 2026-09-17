export type QueenMethod = "comb" | "transfer";
export type QueenNextAction = "cells" | "protectors" | "undecided";

export const METHOD_LABEL: Record<QueenMethod, string> = {
  comb: "Сот",
  transfer: "Перенос",
};

export const NEXT_ACTION_LABEL: Record<QueenNextAction, string> = {
  cells: "Відбір маточників",
  protectors: "Вдягання бігудішок",
  undecided: "Дію ще не обрано",
};

export const QUEEN_STATUSES = [
  { value: "planned", label: "Заплановано" },
  { value: "in_progress", label: "Виконується" },
  { value: "awaiting_acceptance", label: "Очікує контролю прийому" },
  { value: "accepted", label: "Прийом підтверджено" },
  { value: "partial", label: "Частково прийнято" },
  { value: "moved_to_nurse", label: "Переставлено у виховательку" },
  { value: "developing", label: "Розвивається" },
  { value: "needs_quiet", label: "Потрібна тиша та спокій" },
  { value: "ready_decision", label: "Готово до вибору дії" },
  { value: "ready_cells", label: "Готово до відбору" },
  { value: "ready_protectors", label: "Готово до вдягання бігудішок" },
  { value: "cells_taken", label: "Маточники відібрано" },
  { value: "protectors_set", label: "Бігудішки встановлено" },
  { value: "awaiting_emergence", label: "Очікується вихід маток" },
  { value: "queens_done", label: "Матки отримано" },
  { value: "finished", label: "Завершено" },
  { value: "cancelled", label: "Скасовано" },
] as const;

export function statusLabel(value: string | null | undefined) {
  return QUEEN_STATUSES.find((s) => s.value === value)?.label ?? "Заплановано";
}

export type StepDef = {
  key: string;
  title: string;
  dayFrom: number;
  dayTo?: number;
  advice: string;
  warning?: string;
  critical?: boolean;
  /** крок, на якому вводиться фактична кількість прийнятих личинок */
  acceptance?: boolean;
  /** крок відбору маточників / бігудішок */
  mainAction?: boolean;
  /** крок виходу маток */
  emergence?: boolean;
  /** крок вибору: забираємо маточники або вдягаємо бігудішки */
  decision?: boolean;
};


export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayLabel(s: StepDef) {
  return s.dayTo != null && s.dayTo !== s.dayFrom
    ? `День ${s.dayFrom}–${s.dayTo}`
    : `День ${s.dayFrom}`;
}

const QUIET_WARNING =
  "Потрібні спокій і тиша: не турбувати виховательку, не розбирати гніздо, не трясти рамки з маточниками.";

const HARVEST_CRITICAL =
  "КРИТИЧНО: вихід матки можливий уже наступного дня. Одна матка, що вийде першою, знищить решту маточників і зіпсує всю партію. Не відкладайте відбір.";

const INTRO_ADVICE =
  "Підсаджуйте неплідних маток у відводки протягом перших трьох днів після виходу. Після третього дня результат підсаджування менш передбачуваний.";

export function buildStepDefs(method: QueenMethod, nextAction: QueenNextAction): StepDef[] {
  if (method === "comb") {
    const steps: StepDef[] = [
      {
        key: "eggs",
        title: "Матка відкладає яйця у спеціальний сот",
        dayFrom: 0,
        advice: "Обмежте матку на світлому щойно відбудованому соті у сильній материнській сім’ї.",
        warning: "Яйця ще не личинки — переносити їх у стартер раніше 4-го дня заборонено.",
      },
      {
        key: "incubate",
        title: "Сот залишається у материнському вулику",
        dayFrom: 0,
        dayTo: 3,
        advice: "Три дні яйця розвиваються у материнській сім’ї — сот не турбувати.",
      },
      {
        key: "starter",
        title: "З’явилися одноденні личинки — рамку у стартер",
        dayFrom: 4,
        advice: "Переносьте рамку швидко й тепло, без охолодження та прямого сонця.",
        warning: "Личинки старші за добу дають гірших маток — не пропускайте цей день.",
      },
      {
        key: "acceptance",
        title: "Контроль прийому + перестановка у виховательку",
        dayFrom: 5,
        advice:
          "Порахуйте фактично прийняті личинки й того ж дня переставте рамку зі стартера у виховательку.",
        warning:
          "Прийом менше половини — перевірте силу стартера та якість личинок; позначте партію як «Частково прийнято».",
        acceptance: true,
      },
      {
        key: "develop",
        title: "Розвиток прийнятих личинок і маточників у виховательці",
        dayFrom: 5,
        dayTo: 13,
        advice: "Вихователька має бути забезпечена кормом, пергою та молодими бджолами.",
      },
      { key: "quiet", title: "Період спокою та тиші", dayFrom: 10, dayTo: 13, advice: "Лише зовнішній огляд.", warning: QUIET_WARNING },
    ];
    if (nextAction === "cells") {
      steps.push({
        key: "harvest",
        title: "Відбір зрілих маточників",
        dayFrom: 14,
        advice: "Зафіксуйте фактичну дату, кількість відібраних маточників і примітки.",
        warning: HARVEST_CRITICAL,
        critical: true,
        mainAction: true,
      });
    } else {
      steps.push(
        {
          key: "protectors",
          title: "Вдягання захисних бігудішок на маточники",
          dayFrom: 14,
          advice: "Вдягайте бігудішки обережно, не притискаючи маточник.",
          warning: "Без бігудішок перша матка, що вийде, знищить решту маточників — це критично.",
          critical: true,
          mainAction: true,
        },
        {
          key: "emergence",
          title: "Вихід маток, перевірка якості та забір неплідних маток",
          dayFrom: 15,
          dayTo: 16,
          advice: "Відберіть повноцінних маток, дрібних і кривих — відбракуйте.",
          emergence: true,
        },
        { key: "intro", title: "Підсаджування у відводки", dayFrom: 16, dayTo: 19, advice: INTRO_ADVICE, warning: "Після третього дня від виходу результат менш передбачуваний." },
      );
    }
    return steps;
  }

  const steps: StepDef[] = [
    {
      key: "transfer",
      title: "Перенос одноденних личинок у мисочки та постановка у стартер",
      dayFrom: 0,
      advice: "Працюйте у теплі, з вологою серветкою; мисочки ставте у стартер одразу.",
      warning: "Беріть лише одноденних личинок — старші дають гірших маток.",
    },
    {
      key: "acceptance",
      title: "Контроль прийому + перестановка у виховательку",
      dayFrom: 1,
      advice:
        "Порахуйте фактично прийняті мисочки й того ж дня переставте рамку у виховательку.",
      warning:
        "Слабкий прийом — перевірте силу стартера й вік личинок; позначте партію як «Частково прийнято».",
      acceptance: true,
    },
    {
      key: "develop",
      title: "Розвиток прийнятих личинок і маточників у виховательці",
      dayFrom: 1,
      dayTo: 9,
      advice: "Тримайте виховательку сильною, з кормом і молодими бджолами.",
    },
    { key: "quiet", title: "Період спокою та тиші", dayFrom: 6, dayTo: 9, advice: "Лише зовнішній огляд.", warning: QUIET_WARNING },
  ];
  if (nextAction === "cells") {
    steps.push({
      key: "harvest",
      title: "Відбір зрілих маточників",
      dayFrom: 10,
      advice: "Зафіксуйте фактичну дату, кількість відібраних маточників і примітки.",
      warning: HARVEST_CRITICAL,
      critical: true,
      mainAction: true,
    });
  } else {
    steps.push(
      {
        key: "protectors",
        title: "Вдягання захисних бігудішок на зрілі маточники",
        dayFrom: 10,
        advice: "Вдягайте бігудішки обережно, не притискаючи маточник.",
        warning: "Без бігудішок перша матка, що вийде, знищить решту маточників — це критично.",
        critical: true,
        mainAction: true,
      },
      {
        key: "emergence",
        title: "Вихід неплідних маток, перевірка та забір",
        dayFrom: 11,
        dayTo: 12,
        advice: "Відберіть повноцінних маток, дрібних і кривих — відбракуйте.",
        emergence: true,
      },
      { key: "intro", title: "Підсаджування у відводки", dayFrom: 12, dayTo: 15, advice: INTRO_ADVICE, warning: "Після третього дня від виходу результат менш передбачуваний." },
    );
  }
  return steps;
}

/** Планові дати партії, розраховані від дати початку. Усі лишаються редагованими вручну. */
export function plannedDates(method: QueenMethod, start: string) {
  if (method === "comb") {
    return {
      eggs_laid_on: start,
      larvae_hatched_on: addDays(start, 4),
      starter_on: addDays(start, 4),
      acceptance_check_on: addDays(start, 5),
      nurse_on: addDays(start, 5),
      sealed_on: addDays(start, 9),
      next_action_planned_on: addDays(start, 14),
    };
  }
  return {
    eggs_laid_on: null as string | null,
    larvae_hatched_on: start,
    starter_on: start,
    acceptance_check_on: addDays(start, 1),
    nurse_on: addDays(start, 1),
    sealed_on: addDays(start, 5),
    next_action_planned_on: addDays(start, 10),
  };
}

export function suggestedStatus(
  method: QueenMethod,
  nextAction: QueenNextAction,
  start: string,
  today = new Date().toISOString().slice(0, 10),
) {
  const d = Math.round(
    (new Date(`${today}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000,
  );
  const check = method === "comb" ? 5 : 1;
  const action = method === "comb" ? 14 : 10;
  const quietFrom = method === "comb" ? 10 : 6;
  if (d < 0) return "planned";
  if (d < check) return "in_progress";
  if (d === check) return "awaiting_acceptance";
  if (d < quietFrom) return "developing";
  if (d < action) return "needs_quiet";
  if (d === action) return nextAction === "cells" ? "ready_cells" : "ready_protectors";
  return nextAction === "cells" ? "cells_taken" : "awaiting_emergence";
}
