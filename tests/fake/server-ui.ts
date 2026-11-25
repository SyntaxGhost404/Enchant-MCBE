/** Stand-in for @minecraft/server-ui. Tests queue the answers the player gives to the next forms. */

export enum FormCancelationReason {
  UserBusy = 'UserBusy',
  UserClosed = 'UserClosed'
}

export interface Answer {
  canceled?: boolean;
  cancelationReason?: FormCancelationReason;
  selection?: number;
  /** Runs while the form is open, before the answer is given (for example the player moves an item). */
  before?: () => void;
}

export const ui = {
  answers: [] as Answer[],
  shown: [] as { kind: string; title: unknown; body: unknown; buttons: unknown[] }[]
};

class BaseForm {
  protected data = { title: undefined as unknown, body: undefined as unknown, buttons: [] as unknown[] };
  constructor(private readonly kind: string) {}
  title(t: unknown) {
    this.data.title = t;
    return this;
  }
  body(b: unknown) {
    this.data.body = b;
    return this;
  }
  async show(_player: unknown) {
    ui.shown.push({ kind: this.kind, ...this.data });
    const a = ui.answers.shift() ?? { canceled: true, cancelationReason: FormCancelationReason.UserClosed };
    a.before?.();
    return { canceled: !!a.canceled, cancelationReason: a.cancelationReason, selection: a.selection };
  }
}

export class ActionFormData extends BaseForm {
  constructor() {
    super('action');
  }
  button(text: unknown, _icon?: string) {
    this.data.buttons.push(text);
    return this;
  }
}

export class MessageFormData extends BaseForm {
  constructor() {
    super('message');
  }
  button1(text: unknown) {
    this.data.buttons[0] = text;
    return this;
  }
  button2(text: unknown) {
    this.data.buttons[1] = text;
    return this;
  }
}
