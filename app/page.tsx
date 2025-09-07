"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { jsPDF } from "jspdf";
import { BookOpen, Save, Download, Trash2 } from "lucide-react"

export default function CornellNotesApp() {
  const [cues, setCues] = useState("")
  const [notes, setNotes] = useState("")
  const [summary, setSummary] = useState("")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const doc = new jsPDF();

  // Carregar dados salvos ao inicializar
  useEffect(() => {
    const savedData = localStorage.getItem("cornell-notes")
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setCues(parsedData.cues || "")
        setNotes(parsedData.notes || "")
        setSummary(parsedData.summary || "")
        setLastSaved(new Date(parsedData.timestamp))
      } catch (error) {
        console.error("Erro ao carregar dados salvos:", error)
      }
    }
  }, [])

  // Auto-save quando os dados mudam
  useEffect(() => {
    const autoSave = async () => {
      if (cues || notes || summary) {
        setIsAutoSaving(true)
        const noteData = {
          cues,
          notes,
          summary,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem("cornell-notes", JSON.stringify(noteData))
        setLastSaved(new Date())
        
        // Simular delay para mostrar o indicador
        setTimeout(() => {
          setIsAutoSaving(false)
        }, 1000)
      }
    }

    // Debounce para evitar muitas chamadas
    const timeoutId = setTimeout(autoSave, 2000)
    return () => clearTimeout(timeoutId)
  }, [cues, notes, summary])

  // Aviso antes de sair se houver mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAutoSaving) {
        e.preventDefault()
        e.returnValue = 'Suas notas estão sendo salvas. Tem certeza que deseja sair?'
        return 'Suas notas estão sendo salvas. Tem certeza que deseja sair?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isAutoSaving])

  const handleSave = () => {
    const noteData = {
      cues,
      notes,
      summary,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem("cornell-notes", JSON.stringify(noteData))
    setLastSaved(new Date())
    
    // Feedback visual temporário
    const button = document.querySelector('[data-save-button]') as HTMLButtonElement
    if (button) {
      const originalText = button.textContent
      button.textContent = 'Salvo!'
      button.disabled = true
      setTimeout(() => {
        button.textContent = originalText
        button.disabled = false
      }, 1500)
    }
  }

  const handleExport = async () => {
    // Mostrar feedback visual
    const button = document.querySelector('[data-export-button]') as HTMLButtonElement
    if (button) {
      button.disabled = true
      button.textContent = 'Gerando PDF...'
    }

    try {
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)

      // Configurações de fonte
      doc.setFont('helvetica')

      // Cabeçalho
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('NOTAS DE CORNELL', pageWidth / 2, 30, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, 40, { align: 'center' })

      // Linha separadora
      doc.setLineWidth(0.5)
      doc.line(margin, 50, pageWidth - margin, 50)

      let yPosition = 60

      // Seção Palavras-chave
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('PALAVRAS-CHAVE / PISTAS', margin, yPosition)
      yPosition += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const cuesLines = doc.splitTextToSize(cues || 'Nenhuma palavra-chave anotada.', contentWidth)
      doc.text(cuesLines, margin, yPosition)
      yPosition += (cuesLines.length * 5) + 15

      // Linha separadora
      doc.setLineWidth(0.3)
      doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5)

      // Seção Notas Principais
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('NOTAS PRINCIPAIS', margin, yPosition)
      yPosition += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const notesLines = doc.splitTextToSize(notes || 'Nenhuma nota anotada.', contentWidth)
      doc.text(notesLines, margin, yPosition)
      yPosition += (notesLines.length * 5) + 15

      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 60) {
        doc.addPage()
        yPosition = 30
      }

      // Linha separadora
      doc.setLineWidth(0.3)
      doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5)

      // Seção Resumo
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('RESUMO', margin, yPosition)
      yPosition += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const summaryLines = doc.splitTextToSize(summary || 'Nenhum resumo escrito.', contentWidth)
      doc.text(summaryLines, margin, yPosition)

      // Rodapé
      const footerY = pageHeight - 20
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text('Gerado pelo Cornell Notes App', pageWidth / 2, footerY, { align: 'center' })

      // Download do PDF
      const fileName = `cornell-notes-${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(fileName)

      // Restaurar botão
      if (button) {
        button.disabled = false
        button.textContent = 'Exportar PDF'
      }

    } catch (error) {
      console.error('Erro ao gerar PDF:', error)

      // Fallback para TXT se PDF falhar
      const content = `NOTAS DE CORNELL
Data: ${new Date().toLocaleDateString("pt-BR")}

PALAVRAS-CHAVE/PISTAS:
${cues}

NOTAS:
${notes}

RESUMO:
${summary}`

      const blob = new Blob([content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cornell-notes-${new Date().toISOString().split("T")[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)

      // Restaurar botão
      if (button) {
        button.disabled = false
        button.textContent = 'Exportar PDF'
      }

      alert('PDF não disponível. Arquivo TXT foi baixado como alternativa.')
    }
  }

  const handleClear = () => {
    if (confirm("Tem certeza que deseja limpar todas as notas?")) {
      setCues("")
      setNotes("")
      setSummary("")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cornell Notes</h1>
                <p className="text-sm text-muted-foreground">Método de anotações estruturadas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                {isAutoSaving ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Salvando...</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      Salvo às {lastSaved.toLocaleTimeString("pt-BR", { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Não salvo</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  variant="ghost"
                  size="sm"
                  data-save-button
                  className="h-9 px-4 text-sm font-medium hover:bg-accent/10 hover:text-accent transition-all duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  onClick={handleExport}
                  variant="ghost"
                  size="sm"
                  data-export-button
                  className="h-9 px-4 text-sm font-medium hover:bg-accent/10 hover:text-accent transition-all duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={handleClear}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-4 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Enhanced */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-200px)] fade-in">
          {/* Cues Section */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl h-full flex flex-col shadow-sm hover:shadow-md">
              <div className="p-6 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20">
                    <BookOpen className="h-4 w-4 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-card-foreground">
                    Palavras-chave
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Conceitos importantes e perguntas
                </p>
              </div>
              <div className="p-6 flex-1">
                <Textarea
                  placeholder="Digite palavras-chave, perguntas ou tópicos principais..."
                  value={cues}
                  onChange={(e) => setCues(e.target.value)}
                  className="flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed focus-visible:ring-0 min-h-[400px] placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="lg:col-span-6">
            <div className="bg-background border-2 border-accent/20 rounded-xl h-full flex flex-col">
              <div className="p-6 border-b border-border bg-gradient-to-r from-accent/5 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Notas Principais
                  </h2>
                  <div className="ml-auto px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                    Foco
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Informações detalhadas e explicações
                </p>
              </div>
              <div className="p-6 flex-1">
                <Textarea
                  placeholder="Escreva suas notas detalhadas aqui..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed focus-visible:ring-0 min-h-[400px] placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl h-full flex flex-col shadow-sm hover:shadow-md">
              <div className="p-6 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-card-foreground">
                    Resumo
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pontos principais e conclusões
                </p>
              </div>
              <div className="p-6 flex-1">
                <Textarea
                  placeholder="Resuma os pontos principais e conclusões..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed focus-visible:ring-0 min-h-[400px] placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Instructions */}
        <div className="mt-12">
          <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Como usar o método Cornell</h3>
              <p className="text-muted-foreground">Siga estes passos para maximizar sua aprendizagem</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors duration-200">
                  <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                    <span className="text-accent-foreground font-bold text-sm">1</span>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-3">Palavras-chave</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Anote conceitos importantes, perguntas e tópicos principais durante a aula.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors duration-200">
                  <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                    <span className="text-accent-foreground font-bold text-sm">2</span>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-3">Notas</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Escreva informações detalhadas, explicações e exemplos na área principal.
                </p>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/20 transition-colors duration-200">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-3">Resumo</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Após a aula, resuma os pontos principais e suas conclusões.
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
