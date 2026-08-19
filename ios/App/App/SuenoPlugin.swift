import Foundation
import Capacitor
import HealthKit

// Plugin propio para leer el SUEÑO de Apple Salud (HealthKit).
// El plugin community `capacitor-health` no expone `sleepAnalysis`, así que
// leemos la categoría nosotros y devolvemos minutos dormidos por noche.
// El backend (/api/salud/importar) ya sabe recibir { sueno: [{ fecha, minutos }] }.
@objc(SuenoPlugin)
public class SuenoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SuenoPlugin"
    public let jsName = "Sueno"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "disponible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pedirPermiso", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consultar", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()

    private var tipoSueno: HKCategoryType? {
        HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
    }

    @objc func disponible(_ call: CAPPluginCall) {
        call.resolve(["disponible": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func pedirPermiso(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let tipo = tipoSueno else {
            call.reject("Apple Salud no está disponible en este dispositivo.")
            return
        }
        // Solo lectura de sueño. No escribimos nada en Salud.
        store.requestAuthorization(toShare: [], read: [tipo]) { ok, err in
            if let err = err { call.reject(err.localizedDescription); return }
            call.resolve(["ok": ok])
        }
    }

    @objc func consultar(_ call: CAPPluginCall) {
        guard let tipo = tipoSueno else {
            call.reject("No hay tipo de sueño en HealthKit.")
            return
        }

        // Rango en milisegundos (JS). Por defecto: últimos 14 días.
        let ahoraMs = Date().timeIntervalSince1970 * 1000
        let desdeMs = call.getDouble("desde") ?? (ahoraMs - 14 * 86_400_000)
        let hastaMs = call.getDouble("hasta") ?? ahoraMs
        let desde = Date(timeIntervalSince1970: desdeMs / 1000)
        let hasta = Date(timeIntervalSince1970: hastaMs / 1000)

        let pred = HKQuery.predicateForSamples(withStart: desde, end: hasta, options: [])
        let orden = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let q = HKSampleQuery(sampleType: tipo, predicate: pred, limit: HKObjectQueryNoLimit, sortDescriptors: [orden]) { [weak self] _, muestras, err in
            if let err = err { call.reject(err.localizedDescription); return }
            guard let self = self else { call.resolve(["noches": []]); return }

            // Nos quedamos solo con los tramos "dormido" (no "en la cama" ni "despierto").
            let dormido = ((muestras as? [HKCategorySample]) ?? [])
                .filter { self.esDormido($0.value) }
                .map { (inicio: $0.startDate, fin: $0.endDate) }

            // Unimos tramos que se solapan para NO contar doble (Watch + iPhone + apps).
            let tramos = self.unir(dormido)

            // Atribuimos cada tramo al día en que TERMINA (cuando te despertás).
            var porDia: [String: Double] = [:]
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            fmt.timeZone = TimeZone.current
            for t in tramos {
                let minutos = t.fin.timeIntervalSince(t.inicio) / 60
                porDia[fmt.string(from: t.fin), default: 0] += minutos
            }

            let noches = porDia
                .map { ["fecha": $0.key, "minutos": Int($0.value.rounded())] }
                .sorted { ($0["fecha"] as! String) < ($1["fecha"] as! String) }

            call.resolve(["noches": noches])
        }
        store.execute(q)
    }

    // ¿Este valor de sleepAnalysis cuenta como "dormido"?
    private func esDormido(_ valor: Int) -> Bool {
        if #available(iOS 16.0, *) {
            switch valor {
            case HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                 HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                 HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                 HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue:
                return true
            default:
                return false
            }
        } else {
            return valor == HKCategoryValueSleepAnalysis.asleep.rawValue
        }
    }

    // Une intervalos solapados en tramos disjuntos (evita el doble conteo).
    private func unir(_ tramos: [(inicio: Date, fin: Date)]) -> [(inicio: Date, fin: Date)] {
        let ordenados = tramos.sorted { $0.inicio < $1.inicio }
        var resultado: [(inicio: Date, fin: Date)] = []
        for t in ordenados {
            if var ultimo = resultado.last, t.inicio <= ultimo.fin {
                ultimo.fin = max(ultimo.fin, t.fin)
                resultado[resultado.count - 1] = ultimo
            } else {
                resultado.append(t)
            }
        }
        return resultado
    }
}
