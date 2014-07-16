class Hive::Mailer < Devise.parent_mailer.constantize
  include Devise::Mailers::Helpers

  def confirmation_instructions(record, token, opts={})
    @record = record
    @token = token
    I18n.with_locale(locale) do
      devise_mail(record, :confirmation_instructions, opts)
    end
  end

  def reset_password_instructions(record, token, opts={})
    @record = record
    @token = token
    I18n.with_locale(locale) do
      devise_mail(record, :reset_password_instructions, opts)
    end
  end

  def unlock_instructions(record, token, opts={})
    @record = record
    @token = token
    I18n.with_locale(locale) do
      devise_mail(record, :unlock_instructions, opts)
    end
  end


  protected
    # Returns the locale for the mailer. The method tries to read a +locale+
    # attribute from the user model (recipient) if such attribute does not
    # exist it returns the current locale.
    def locale
      (@record.try(:locale) || I18n.locale).to_sym
    end
end
