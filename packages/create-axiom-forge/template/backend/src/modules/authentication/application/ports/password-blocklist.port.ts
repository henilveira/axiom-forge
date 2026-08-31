export interface PasswordBlocklistPort {
  contains(password: string): boolean | Promise<boolean>;
}
