#!/usr/bin/env python3
import struct
import os

def align(val, alignment):
    return (val + alignment - 1) & ~(alignment - 1)

def create_windows_launcher_exe(url_str: str, out_path: str):
    image_base = 0x00400000
    sec_rva = 0x1000
    file_align = 0x200
    sec_align = 0x1000

    # Strings
    op_str = b"open\0"
    url_bytes = url_str.encode('utf-8') + b"\0"
    k32_dll = b"KERNEL32.dll\0"
    shell_dll = b"SHELL32.dll\0"
    fn_exit = b"\x00\x00ExitProcess\0" # 2-byte hint + name
    fn_shellexec = b"\x00\x00ShellExecuteA\0" # 2-byte hint + name

    # Section layout inside .text (RVA = sec_rva):
    # 0x000: Code (starts at sec_rva + 0)
    # 0x040: IAT:
    #        [0x040]: IAT_ShellExecuteA
    #        [0x044]: 0 (null terminator)
    #        [0x048]: IAT_ExitProcess
    #        [0x04C]: 0 (null terminator)
    # 0x060: IDT (Import Directory Table):
    #        Entry 1: SHELL32.dll (20 bytes)
    #        Entry 2: KERNEL32.dll (20 bytes)
    #        Entry 3: NULL terminator (20 bytes)
    #        Total 60 bytes (0x60 - 0x9B)
    # 0x0A0: ILT (Import Lookup Table):
    #        [0x0A0]: ILT_ShellExecuteA
    #        [0x0A4]: 0
    #        [0x0A8]: ILT_ExitProcess
    #        [0x0AC]: 0
    # 0x0B0: Data & Strings:
    #        hint/name entries and ASCII strings

    iat_offset = 0x40
    idt_offset = 0x60
    ilt_offset = 0xA0
    data_offset = 0xB0

    # Addresses inside section
    rva_iat_shellexec = sec_rva + iat_offset
    rva_iat_exit = sec_rva + iat_offset + 8

    rva_ilt_shellexec = sec_rva + ilt_offset
    rva_ilt_exit = sec_rva + ilt_offset + 8

    # Offsets in data_offset
    off = data_offset
    off_fn_shellexec = off
    off += len(fn_shellexec)
    if off % 2 != 0: off += 1 # align to word

    off_fn_exit = off
    off += len(fn_exit)
    if off % 2 != 0: off += 1

    off_shell_dll = off
    off += len(shell_dll)

    off_k32_dll = off
    off += len(k32_dll)

    off_op_str = off
    off += len(op_str)

    off_url_str = off
    off += len(url_bytes)

    sec_raw_size = align(off, file_align)

    # Build code
    # push 1                  ; nShowCmd = SW_SHOWNORMAL (6A 01)
    # push 0                  ; lpDirectory = NULL       (6A 00)
    # push 0                  ; lpParameters = NULL      (6A 00)
    # push (image_base + sec_rva + off_url_str) ; lpFile (68 xx xx xx xx)
    # push (image_base + sec_rva + off_op_str)  ; lpOperation (68 xx xx xx xx)
    # push 0                  ; hwnd = NULL              (6A 00)
    # call [image_base + rva_iat_shellexec]              (FF 15 xx xx xx xx)
    # push 0                  ; uExitCode = 0            (6A 00)
    # call [image_base + rva_iat_exit]                   (FF 15 xx xx xx xx)
    # ret                                                (C3)

    code = bytearray()
    code += b"\x6A\x01"                                # push 1
    code += b"\x6A\x00"                                # push 0
    code += b"\x6A\x00"                                # push 0
    code += b"\x68" + struct.pack("<I", image_base + sec_rva + off_url_str)
    code += b"\x68" + struct.pack("<I", image_base + sec_rva + off_op_str)
    code += b"\x6A\x00"                                # push 0
    code += b"\xFF\x15" + struct.pack("<I", image_base + rva_iat_shellexec)
    code += b"\x6A\x00"                                # push 0
    code += b"\xFF\x15" + struct.pack("<I", image_base + rva_iat_exit)
    code += b"\xC3"                                    # ret

    sec_data = bytearray(sec_raw_size)
    sec_data[0:len(code)] = code

    # IAT & ILT
    rva_hn_shellexec = sec_rva + off_fn_shellexec
    rva_hn_exit = sec_rva + off_fn_exit

    # Write IAT
    struct.pack_into("<II", sec_data, iat_offset, rva_hn_shellexec, 0)
    struct.pack_into("<II", sec_data, iat_offset + 8, rva_hn_exit, 0)

    # Write ILT
    struct.pack_into("<II", sec_data, ilt_offset, rva_hn_shellexec, 0)
    struct.pack_into("<II", sec_data, ilt_offset + 8, rva_hn_exit, 0)

    # Write IDT
    # Entry 1: SHELL32.dll
    struct.pack_into("<IIIII", sec_data, idt_offset,
                     rva_ilt_shellexec,          # OriginalFirstThunk
                     0,                          # TimeDateStamp
                     0,                          # ForwarderChain
                     sec_rva + off_shell_dll,    # Name
                     rva_iat_shellexec)          # FirstThunk
    # Entry 2: KERNEL32.dll
    struct.pack_into("<IIIII", sec_data, idt_offset + 20,
                     rva_ilt_exit,               # OriginalFirstThunk
                     0,                          # TimeDateStamp
                     0,                          # ForwarderChain
                     sec_rva + off_k32_dll,      # Name
                     rva_iat_exit)               # FirstThunk
    # Entry 3 is all zeros (already 0)

    # Write data strings
    sec_data[off_fn_shellexec:off_fn_shellexec + len(fn_shellexec)] = fn_shellexec
    sec_data[off_fn_exit:off_fn_exit + len(fn_exit)] = fn_exit
    sec_data[off_shell_dll:off_shell_dll + len(shell_dll)] = shell_dll
    sec_data[off_k32_dll:off_k32_dll + len(k32_dll)] = k32_dll
    sec_data[off_op_str:off_op_str + len(op_str)] = op_str
    sec_data[off_url_str:off_url_str + len(url_bytes)] = url_bytes

    # Build Headers (size 0x200 = file_align)
    headers = bytearray(file_align)

    # DOS Header
    headers[0:2] = b"MZ"
    struct.pack_into("<H", headers, 0x3C, 0x80) # e_lfanew = 128

    # PE Signature
    pe_offset = 0x80
    headers[pe_offset:pe_offset + 4] = b"PE\0\0"

    # COFF File Header (20 bytes)
    coff_offset = pe_offset + 4
    struct.pack_into("<HHIIIHH", headers, coff_offset,
                     0x014C,                     # Machine: i386
                     1,                          # NumberOfSections: 1
                     0,                          # TimeDateStamp
                     0,                          # PointerToSymbolTable
                     0,                          # NumberOfSymbols
                     224,                        # SizeOfOptionalHeader
                     0x0102)                     # Characteristics: EXECUTABLE_IMAGE | 32BIT_MACHINE

    # Optional Header (PE32 - 224 bytes)
    opt_offset = coff_offset + 20
    struct.pack_into("<HBBIIIIII", headers, opt_offset,
                     0x010B,                     # Magic: PE32
                     1, 0,                       # LinkerVersion
                     sec_raw_size,               # SizeOfCode
                     0,                          # SizeOfInitializedData
                     0,                          # SizeOfUninitializedData
                     sec_rva,                    # AddressOfEntryPoint (offset 0 in section)
                     sec_rva,                    # BaseOfCode
                     sec_rva)                    # BaseOfData

    opt_offset_win = opt_offset + 28
    sec_virtual_size = align(sec_raw_size, sec_align)
    size_of_image = sec_rva + sec_virtual_size

    struct.pack_into("<IIIHHHHHHIIIIHHIIIIII", headers, opt_offset_win,
                     image_base,                 # ImageBase: 0x00400000
                     sec_align,                  # SectionAlignment: 0x1000
                     file_align,                 # FileAlignment: 0x200
                     4, 0,                       # OperatingSystemVersion: 4.0
                     0, 0,                       # ImageVersion: 0.0
                     4, 0,                       # SubsystemVersion: 4.0
                     0,                          # Win32VersionValue
                     size_of_image,              # SizeOfImage
                     file_align,                 # SizeOfHeaders
                     0,                          # CheckSum
                     2,                          # Subsystem: 2 (IMAGE_SUBSYSTEM_WINDOWS_GUI)
                     0,                          # DllCharacteristics
                     0x100000,                   # SizeOfStackReserve
                     0x1000,                     # SizeOfStackCommit
                     0x100000,                   # SizeOfHeapReserve
                     0x1000,                     # SizeOfHeapCommit
                     0,                          # LoaderFlags
                     16)                         # NumberOfRvaAndSizes

    # Data Directories (16 entries * 8 bytes = 128 bytes)
    dd_offset = opt_offset + 96
    # Entry 1: Import Table (Index 1)
    idt_rva = sec_rva + idt_offset
    idt_size = 60 # 3 entries * 20 bytes
    struct.pack_into("<II", headers, dd_offset + 8, idt_rva, idt_size)

    # Entry 12: IAT (Index 12)
    iat_rva = sec_rva + iat_offset
    iat_size = 16
    struct.pack_into("<II", headers, dd_offset + (12 * 8), iat_rva, iat_size)

    # Section Header (40 bytes)
    sec_hdr_offset = opt_offset + 224
    struct.pack_into("<8sIIIIIIHHI", headers, sec_hdr_offset,
                     b".text\0\0\0",
                     sec_virtual_size,           # VirtualSize
                     sec_rva,                    # VirtualAddress
                     sec_raw_size,               # SizeOfRawData
                     file_align,                 # PointerToRawData
                     0,                          # PointerToRelocations
                     0,                          # PointerToLinenumbers
                     0, 0,                       # NumberOfRelocations, Linenumbers
                     0xE0000020)                 # Characteristics: CODE | EXECUTE | READ | WRITE

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(headers)
        f.write(sec_data)

    print(f"Generated Windows PE EXE successfully: {out_path} ({len(headers) + len(sec_data)} bytes)")

if __name__ == "__main__":
    target_url = "https://ais-pre-7v2ybbenoneaktwif4yyyx-518853989588.europe-west2.run.app"
    create_windows_launcher_exe(target_url, "public/منظومة_وزارة_التموين.exe")
    create_windows_launcher_exe(target_url, "dist/منظومة_وزارة_التموين.exe")
