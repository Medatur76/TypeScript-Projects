type element = "Row" | "Box" | "Text";
type data = {
    width: number,
    height: number
};
type textOptions = {};
type funcOverride<K> = {
    func: K;
    override: boolean;
};

export interface TUIElementI {
    type: element;
    data: data;
    render: (self: TUIElementI, width: number, height: number, parent: TUI) => void;
    update: (self: TUIElementI, value: string, parent?: TUI) => void;
}

export interface TUIRowI extends TUIElementI {
    type: "Row";
    objects: TUIElementI[];
}

export interface TUIBoxI extends TUIElementI {
    type: "Box";
    objects: TUIElementI[];
}

export function genTUIBox(objects?: TUIElementI[], title?: string, opt?: textOptions, updateOverride?: funcOverride<(self: TUIElementI, value: string, parent?: TUI) => void>): TUIBoxI {
    return { type: "Box", objects: objects ? objects : [], data: { width: objects ? objects.reduce((max, current) => Math.max(max, current.data.width) + 2, title ? title.length : 0) : title ? title.length : 0, height: (objects ? objects.length : 0) + 2 }, render: (self, width, height, parent) => {
        parent.write("╭");
        if (title) parent.write("─" + title + "─".repeat(self.data.width - title.length - 1));
        else parent.write("─".repeat(self.data.width))
        parent.write("╮\n");
        for (const element of (self as TUIBoxI).objects) {
            parent.write("│ ");
            element.render(element, width, height, parent);
            parent.write(" ".repeat(self.data.width - element.data.width - 1) + "│\n");
        }
        parent.write("╰" + "─".repeat(self.data.width) + "╯\n");
    }, update: updateOverride && updateOverride.override ? updateOverride.func : (self, value, parent?) => {
        updateOverride ? updateOverride.func(self, value, parent) : null;
        (self as TUIBoxI).objects.forEach(object => object.update(object, value, parent));
        self.data = {
            width: objects ? objects.reduce((max, current) => Math.max(max, current.data.width) + 2, title ? title.length : 0) : title ? title.length : 0,
            height: (objects ? objects.length : 0) + 2
        };
    } };
}

export interface TUITextI extends TUIElementI {
    type: "Text";
    value: string;
}

export function genTUIText(value: string, opt?: textOptions, updateOverride?: funcOverride<(self: TUIElementI, value: string, parent?: TUI) => void>): TUITextI {
    return { type: "Text", data: { width: value.length, height: 1 }, value: value, render: (self, _width, _hight, parent) => parent.write((self as TUITextI).value), update: updateOverride ? updateOverride.func : (_self, _value, _parent) => null };
}

export class TUI {
    private elements: TUIElementI[] = [];
    private encoder = new TextEncoder;

    constructor(elements?: TUIElementI[]) {
        if (elements) this.elements = elements;
    }

    public write(message: string) {
        Deno.stdout.write(this.encoder.encode(message));
    }

    public start(hideCursor?: boolean): void {
        // Set terminal to raw mode
        Deno.stdin.setRaw(true);
        if (hideCursor) this.write('\x1b[?25l');
    }

    public render(): void {
        console.clear();
        this.write('\x1b[0;0H'); // Move cursor to top-left
        const {columns, rows} = Deno.consoleSize();
        for (const element of this.elements)
            element.render(element, columns, rows, this);
    }

    public update(value: string): void {
        for (const element of this.elements)
            element.update(element, value, this);
    }
}