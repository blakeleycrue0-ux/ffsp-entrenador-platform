import re, sys

def pelar(sql: str) -> str:
    """Quita los comentarios que estan FUERA de un bloque $$...$$ o de una
    cadena. Lo de dentro de una funcion no se toca: forma parte de su cuerpo."""
    salida = []
    i, n = 0, len(sql)
    etiqueta = None          # la etiqueta del dollar-quote abierto, si hay
    while i < n:
        if etiqueta is None:
            m = re.match(r"\$[A-Za-z_]*\$", sql[i:])
            if m:
                etiqueta = m.group(0); salida.append(etiqueta); i += len(etiqueta); continue
            if sql[i] == "'":                       # cadena: copiar tal cual
                j = i + 1
                while j < n:
                    if sql[j] == "'":
                        if j + 1 < n and sql[j+1] == "'": j += 2; continue
                        break
                    j += 1
                salida.append(sql[i:j+1]); i = j + 1; continue
            if sql.startswith('--', i):             # comentario de linea
                j = sql.find('\n', i)
                i = n if j == -1 else j             # se deja el \n
                continue
            if sql.startswith('/*', i):             # comentario de bloque
                j = sql.find('*/', i)
                i = n if j == -1 else j + 2
                continue
            salida.append(sql[i]); i += 1
        else:
            if sql.startswith(etiqueta, i):
                salida.append(etiqueta); i += len(etiqueta); etiqueta = None; continue
            salida.append(sql[i]); i += 1
    texto = ''.join(salida)
    texto = re.sub(r'[ \t]+\n', '\n', texto)        # espacios al final
    texto = re.sub(r'\n{3,}', '\n\n', texto)        # huecos de mas
    return texto.strip() + '\n'

print(pelar(open(sys.argv[1], encoding='utf-8').read()), end='')
