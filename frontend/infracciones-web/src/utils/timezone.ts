export const APP_TIME_ZONE = "America/Mexico_City";

interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedDateTimeParts(
  date: Date,
  timeZone = APP_TIME_ZONE,
): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = new Map(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.get("year") ?? 0,
    month: values.get("month") ?? 0,
    day: values.get("day") ?? 0,
    hour: values.get("hour") ?? 0,
    minute: values.get("minute") ?? 0,
    second: values.get("second") ?? 0,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedDateTimeParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const instantRoundedToSecond = Math.floor(date.getTime() / 1_000) * 1_000;

  return zonedAsUtc - instantRoundedToSecond;
}

export function formatDateTimeLocalInput(
  date = new Date(),
  timeZone = APP_TIME_ZONE,
): string {
  const parts = getZonedDateTimeParts(date, timeZone);

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function dateTimeLocalToIso(
  value: string,
  timeZone = APP_TIME_ZONE,
): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    normalized,
  );

  if (!match) {
    throw new RangeError("La fecha y hora local no tiene un formato valido");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const expected: ZonedDateTimeParts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText ?? "0"),
  };

  const wallClockAsUtc = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
    expected.second,
  );
  const calendarCheck = new Date(wallClockAsUtc);

  if (
    calendarCheck.getUTCFullYear() !== expected.year ||
    calendarCheck.getUTCMonth() + 1 !== expected.month ||
    calendarCheck.getUTCDate() !== expected.day ||
    calendarCheck.getUTCHours() !== expected.hour ||
    calendarCheck.getUTCMinutes() !== expected.minute ||
    calendarCheck.getUTCSeconds() !== expected.second
  ) {
    throw new RangeError("La fecha y hora local no es valida");
  }

  let instantMs = wallClockAsUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offsetMs = getTimeZoneOffsetMs(new Date(instantMs), timeZone);
    const adjustedInstantMs = wallClockAsUtc - offsetMs;

    if (adjustedInstantMs === instantMs) {
      break;
    }

    instantMs = adjustedInstantMs;
  }

  const resolved = getZonedDateTimeParts(new Date(instantMs), timeZone);
  const matchesExpected = (
    Object.keys(expected) as Array<keyof ZonedDateTimeParts>
  ).every((key) => resolved[key] === expected[key]);

  if (!matchesExpected) {
    throw new RangeError(
      `La fecha y hora no existe en la zona horaria ${timeZone}`,
    );
  }

  return new Date(instantMs).toISOString();
}
