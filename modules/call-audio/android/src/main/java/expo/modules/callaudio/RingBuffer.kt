package expo.modules.callaudio

import kotlin.math.sqrt

/**
 * Thread-safe rolling circular buffer for 16-bit PCM mono audio.
 * Manages rolling audio windows (e.g. 5 seconds at 16kHz).
 */
class RingBuffer(val capacityBytes: Int) {
    private val buffer = ByteArray(capacityBytes)
    private var writePos = 0
    private var totalBytesWritten: Long = 0
    private val lock = Any()

    fun write(data: ByteArray, offset: Int, length: Int) {
        synchronized(lock) {
            for (i in 0 until length) {
                buffer[writePos] = data[offset + i]
                writePos = (writePos + 1) % capacityBytes
            }
            totalBytesWritten += length
        }
    }

    /**
     * Reads up to the most recent [length] bytes in chronological order.
     */
    fun readLatest(length: Int): ByteArray {
        synchronized(lock) {
            val available = Math.min(length, Math.min(totalBytesWritten.toInt(), capacityBytes))
            val result = ByteArray(available)
            if (available == 0) return result

            val startPos = (writePos - available + capacityBytes) % capacityBytes
            for (i in 0 until available) {
                result[i] = buffer[(startPos + i) % capacityBytes]
            }
            return result
        }
    }

    /**
     * Calculates the Root Mean Square (RMS) level of the latest audio window
     * to validate signal strength and detect silence vs audio activity.
     */
    fun calculateLatestRms(sampleBytes: Int): Double {
        val audioData = readLatest(sampleBytes)
        if (audioData.isEmpty()) return 0.0

        var sumSquare = 0.0
        val sampleCount = audioData.size / 2
        if (sampleCount == 0) return 0.0

        for (i in 0 until audioData.size - 1 step 2) {
            // Convert little-endian bytes to 16-bit short
            val sample = ((audioData[i + 1].toInt() shl 8) or (audioData[i].toInt() and 0xFF)).toShort()
            val normalized = sample / 32768.0
            sumSquare += normalized * normalized
        }

        return sqrt(sumSquare / sampleCount)
    }

    fun getTotalBytesWritten(): Long = synchronized(lock) { totalBytesWritten }

    fun clear() {
        synchronized(lock) {
            buffer.fill(0)
            writePos = 0
            totalBytesWritten = 0
        }
    }
}
