Rails.application.routes.draw do
  # Remember: Devise routes are added in the host app via *hive_for* method.

  match 'validations' => 'hive/validations#validate', via: [:post, :put]
end
