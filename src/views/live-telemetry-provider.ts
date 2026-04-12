import * as vscode from "vscode";

export class LiveDataViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "legoLiveView";

    private _view?: vscode.WebviewView;

    constructor(private readonly getClient: () => any | undefined) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html = this._getHtml();

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "connect") {
                vscode.commands.executeCommand("lego-spikeprime-mindstorms-vscode.connectToHub");
            }
        });

        this._render();
    }

    public updateTelemetry(data: any) {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: "telemetry",
            data,
        });
    }

    public setClientStateChanged() {
        this._render();
    }

    private _render() {
        const client = this.getClient();

        this._view?.webview.postMessage({
            type: "state",
            connected: !!client,
        });
    }

    private _getHtml() {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LEGO Live Data</title>
        </head>
        <body>
            <h1>LEGO Live Data</h1>

            <button id="connectBtn">Connect Hub</button>

            <pre id="data">No data yet...</pre>

            <script>
                const vscode = acquireVsCodeApi();

                const connectBtn = document.getElementById("connectBtn");
                const dataEl = document.getElementById("data");

                // 🔁 Restore previous state
                const oldState = vscode.getState();
                if (oldState) {
                    if (oldState.data) {
                        dataEl.textContent = oldState.data;
                    }

                    if (oldState.connected) {
                        connectBtn.textContent = "Reconnect Hub";
                    }
                }

                // 🔘 Button click
                connectBtn.addEventListener("click", () => {
                    vscode.postMessage({ type: "connect" });
                });

                // 📩 Receive messages from extension (for future telemetry)
                window.addEventListener("message", (event) => {
                    const msg = event.data;

                    if (msg.type === "telemetry") {
                        const text = JSON.stringify(msg.payload, null, 2);

                        // update UI
                        dataEl.textContent = text;

                        // 💾 persist state
                        vscode.setState({
                            data: text,
                            connected: true
                        });
                    }

                    if (msg.type === "connected") {
                        connectBtn.textContent = "Connected";
                        
                        vscode.setState({
                            ...vscode.getState(),
                            connected: true
                        });
                    }
                });

                // 🧪 Initial state fallback (first load)
                if (!oldState) {
                    vscode.setState({
                        data: "No data yet...",
                        connected: false
                    });
                }
            </script>
        </body>
        </html>`;
    }
}