import zlib
import struct
import math
import os

def create_png(width, height, is_maskable=False):
    # RGBA image buffer
    raw_data = bytearray()
    
    cx = width / 2.0
    cy = height / 2.0
    
    # Scale based on size and maskable margin
    scale = (width / 512.0) * (0.8 if is_maskable else 1.0)
    
    r_outer = 160.0 * scale
    r_mid = 110.0 * scale
    r_core = 48.0 * scale
    r_glow = 72.0 * scale

    for y in range(height):
        raw_data.append(0)  # filter byte: None
        for x in range(width):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            
            # Default background: #0c0a09
            r, g, b, a = 12, 10, 9, 255
            
            if dist <= r_core:
                # Amber core: #f59e0b
                r, g, b = 245, 158, 11
            elif dist <= r_glow:
                # Amber glow
                factor = 1.0 - (dist - r_core) / (r_glow - r_core)
                r = int(12 * (1 - factor) + 245 * factor)
                g = int(10 * (1 - factor) + 158 * factor)
                b = int(9 * (1 - factor) + 11 * factor)
            elif abs(dist - r_mid) <= 4.0 * scale:
                # Middle ring #44403c
                r, g, b = 68, 64, 60
            elif abs(dist - r_outer) <= 7.0 * scale:
                # Outer ring #292524
                r, g, b = 41, 37, 36
                
            raw_data.extend([r, g, b, a])

    # PNG chunks
    def chunk(chunk_type, data):
        return struct.pack('>I', len(data)) + chunk_type + data + struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw_data), 9)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
    return png

os.makedirs('public', exist_ok=True)

with open('public/pwa-192x192.png', 'wb') as f:
    f.write(create_png(192, 192, is_maskable=False))

with open('public/pwa-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, is_maskable=False))

with open('public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, is_maskable=True))

with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(create_png(180, 180, is_maskable=False))

print("PWA PNG icons generated successfully!")
