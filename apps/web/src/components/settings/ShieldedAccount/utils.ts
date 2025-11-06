export function copyToClipboard(text: string, e: any) {
    if (!navigator.clipboard) return console.error("clipboard copy only available with https://")
    navigator.clipboard
        .writeText(text)
        .then(() => {
            e.target.title = "✔️ Copied"
            setTimeout(() => {
                e.target.title = ""
            }, 4190)
        })
        .catch(() => { })
}